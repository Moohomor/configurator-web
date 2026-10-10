/* =====================================================================
 * scorm/runtime.ts
 * Реализации LearningRuntime:
 *   Scorm2004Runtime — работа с LMS через API_1484_11;
 *   LocalRuntime     — автономный режим (dev/превью без LMS);
 *   EmbedRuntime     — встроен в сторонний курс: SCORM API не трогается
 *                      вообще, прогресс живёт в отдельном ключе
 *                      localStorage (выбор — в main.ts по embedMode).
 *
 * Приложение работает только с интерфейсом, поэтому наличие или
 * отсутствие LMS нигде не проверяется.
 * ===================================================================== */
import type {
  InteractionRecord,
  LearningRuntime,
  LessonResult,
} from "@/api/types";
import {
  findScorm2004Api,
  formatDuration,
  Scorm2004Session,
} from "./scorm2004";
import type { EmbedMode } from "./lesson";

/**
 * События, на которых SCO реально покидают.
 *
 * `visibilitychange` здесь **нет намеренно**: документ SCO уходит в фон
 * при alt-tab, клике на окно LMS, открытии соседней вкладки. Если на нём
 * Terminate, сессия закрывается посреди работы, а все последующие SetValue
 * молча отбрасываются (см. `Scorm2004Session.terminated`) — обучающий
 * теряет прогресс, и LMS пишет «невозможно сохранить прогресс».
 * `pagehide`/`beforeunload` срабатывают, только когда документ реально
 * уничтожают.
 */
const LEAVE_EVENTS = ["pagehide", "beforeunload"] as const;

abstract class BaseRuntime {
  protected readonly buffer = new Map<string, InteractionRecord>();
  private readonly leaveHandlers: Array<() => void> = [];

  constructor() {
    for (const event of LEAVE_EVENTS) {
      window.addEventListener(event, () => this.handleLeave());
    }
  }

  get interactions(): readonly InteractionRecord[] {
    return [...this.buffer.values()];
  }

  start(): void {
    /* сессию открывает конкретная реализация */
  }

  recordInteraction(interaction: InteractionRecord): void {
    this.buffer.set(interaction.id, interaction);
  }

  onLeave(handler: () => void): void {
    this.leaveHandlers.push(handler);
  }

  protected handleLeave(): void {
    for (const handler of this.leaveHandlers) {
      try {
        handler();
      } catch (error) {
        console.warn("[курс] обработчик ухода со страницы упал", error);
      }
    }
  }
}

export class Scorm2004Runtime extends BaseRuntime
  implements LearningRuntime
{
  readonly kind = "scorm" as const;
  private finished = false;

  constructor(private readonly session: Scorm2004Session) {
    super();
    // Сессию НЕ открываем здесь: Initialize вызывает start(), и он же
    // зовётся из main.ts. Два Initialize в одной SCO-сессии — ошибка SCORM.
  }

  get inLms(): boolean {
    return this.session.isInitialized;
  }

  get label(): string {
    return "Результат автоматически передаётся в систему обучения";
  }

  override start(): void {
    if (!this.session.initialize()) return;

    /*
     * Границы оценки объявляем сразу при Initialize. Часть LMS (HCM в том
     * числе) читает cmi.score.min/max один раз — при первом обращении к
     * score, — и если в этот момент их ещё нет, показывает «0/0» до конца
     * сессии. Мы узнаём оценку только после первого задания, а к этому
     * моменту LMS уже решила, что максимум равен нулю.
     */
    this.session.writeScore(0, 0, 100);
    this.session.set("cmi.completion_status", "incomplete");
    this.session.set("cmi.success_status", "unknown");
    this.session.commit();
  }

  readState<T>(fallback: T): T {
    const raw = this.session.get("cmi.suspend_data");
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  writeState(json: string): void {
    if (!this.inLms || this.finished) return;
    this.session.writeSuspendData(json);
    this.session.set(
      "cmi.session_time",
      formatDuration(this.session.elapsedSeconds),
    );
    this.session.commit();
  }

  /**
   * Записать текущий прогресс, **не закрывая сессию**: score, completion,
   * success, location и накопленные интеракции + Commit.
   *
   * Вызывается на каждое изменение прогресса, а не только по кнопке
   * «завершить»: иначе LMS до самого конца показывает 0/0 и превращает
   * доли секунды работы в потерянные данные, если обучающий ушёл раньше.
   */
  report(result: LessonResult): boolean {
    if (!this.inLms || this.finished) return false;
    return this.writeProgress(result) && this.session.commit();
  }

  finish(result: LessonResult): boolean {
    if (!this.inLms || this.finished) return false;

    let ok = this.writeProgress(result);
    ok = this.session.set("cmi.exit", result.exit) && ok;
    ok = this.session.commit() && ok;
    ok = this.session.terminate() && ok;
    this.finished = true;
    return ok;
  }

  /** Общая часть report() и finish(). */
  private writeProgress(result: LessonResult): boolean {
    let ok = this.session.writeScore(
      result.score,
      result.min ?? 0,
      result.max ?? 100,
    );
    ok = this.session.set("cmi.completion_status", result.completion) && ok;
    ok = this.session.set("cmi.success_status", result.success) && ok;
    if (result.location) {
      ok = this.session.set("cmi.location", result.location) && ok;
    }
    ok = this.session.writeInteractions(this.interactions) && ok;
    ok =
      this.session.set(
        "cmi.session_time",
        formatDuration(this.session.elapsedSeconds),
      ) && ok;
    return ok;
  }

  protected override handleLeave(): void {
    super.handleLeave();
    if (!this.inLms || this.finished) return;
    this.session.set("cmi.exit", "suspend");
    this.session.commit();
    this.session.terminate();
    this.finished = true;
  }
}

/**
 * Режимы без SCORM-сессии: прогресс в localStorage, интеракции — в консоли.
 *
 * Общая часть `LocalRuntime` и `EmbedRuntime`: они различаются только
 * `kind`, `label`, ключом хранения и префиксом сообщения. Отдельные классы
 * (а не один с флагом) — потому что у них разный смысл: LocalRuntime
 * отвечает за себя, EmbedRuntime запрещён трогать чужую сессию.
 */
abstract class BrowserStorageRuntime extends BaseRuntime {
  constructor(
    /** Ключ localStorage, в котором живёт прогресс этого режима. */
    protected readonly stateKey: string,
    /** Префикс сообщения об итоге — чтобы в консоли было видно, кто пишет. */
    private readonly logTag: string,
  ) {
    super();
  }

  readState<T>(fallback: T): T {
    try {
      const raw = localStorage.getItem(this.stateKey);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  writeState(json: string): void {
    try {
      localStorage.setItem(this.stateKey, json);
    } catch {
      /* приватный режим браузера — не критично */
    }
  }

  finish(result: LessonResult): boolean {
    const done = this.interactions.filter((i) => i.result === "correct").length;
    console.info(
      `[${this.logTag}] итог: ${result.score}% — ${result.success}/${result.completion}; ` +
        `выполнено заданий: ${done} из ${this.interactions.length}`,
    );
    return true;
  }

  report(): boolean {
    /* прогресс и так в localStorage, отправлять некуда */
    return true;
  }
}

const LOCAL_STATE_KEY = "configurator:course-progress";

/** Автономный режим: без LMS, но с тем же интерфейсом. Прогресс живёт
 *  в localStorage, интеракции — в консоли. Используется в dev и превью. */
export class LocalRuntime extends BrowserStorageRuntime implements LearningRuntime {
  readonly kind = "local" as const;
  readonly inLms = false;
  readonly label = "Конфигуратор запущен вне LMS — результат не сохраняется";

  constructor() {
    super(LOCAL_STATE_KEY, "курс");
  }

  override start(): void {
    /* сессии нет */
  }
}

/**
 * Режим встраивания в сторонний SCORM-курс.
 *
 * Функционально это LocalRuntime с отдельным ключом localStorage, но
 * класс самостоятельный (не наследник LocalRuntime): у `kind` и `label`
 * здесь свои значения, а три runtime в этом файле и так независимы друг
 * от друга. Хранилище и вывод в консоль — с общим BrowserStorageRuntime.
 *
 * Главное — то, чего в классе нет: этот runtime **никогда** не ищет
 * `API_1484_11` и не вызывает Initialize/Terminate. Встроенный фрейм
 * лежит внутри SCO чужого курса, и наш Initialize сверху чужого —
 * нарушение протокола, после которого LMS считает попытку закрытой и
 * чужой курс ломается. Выбирается только по явному признаку
 * встраивания (см. embedMode в scorm/lesson.ts), а не по наличию API.
 */
const EMBED_STATE_KEY = "configurator:embed-progress";

/**
 * Ключ прогресса лёгкого вьюера (embed-<id>.html).
 *
 * Отдельный намеренно: вьюер вставляется в чужой курс «картинкой посреди
 * текста» и отметки о выполнении заданий там не видны — панели заданий
 * нет. Но трекер всё равно работает, и на общем ключе его отметки
 * (загрузка модели, выбор детали) потом всплыли бы в полном
 * lesson-<id>.html как «уже выполненные задания» — обучающий открывал бы
 * урок сразу готовым. Своим ключом вьюер ничего не портит соседним
 * урокам.
 */
const EMBED_VIEWER_STATE_KEY = "configurator:embed-viewer-progress";

export class EmbedRuntime extends BrowserStorageRuntime implements LearningRuntime {
  readonly kind = "embed" as const;
  readonly inLms = false;
  readonly label =
    "Встроенный режим: результат сохраняется в этом браузере, в LMS не передаётся";

  constructor(stateKey: string = EMBED_STATE_KEY) {
    super(stateKey, "вставка");
  }

  override start(): void {
    /* сессии нет: чужой SCORM API не трогаем никогда */
  }
}

/**
 * Реализация по режиму встраивания. Выбор делается в composition root до
 * всякого поиска `API_1484_11` (см. main.ts).
 */
export function createEmbedRuntime(mode: EmbedMode): EmbedRuntime {
  return new EmbedRuntime(
    mode === "viewer" ? EMBED_VIEWER_STATE_KEY : EMBED_STATE_KEY,
  );
}

/**
 * Выбирает реализацию по наличию API в окне или родителях.
 *
 * Реализация SCORM выбирается по факту нахождения API, а не по успешности
 * Initialize: молча переключаться на localStorage внутри LMS нельзя —
 * прогресс ушёл бы мимо журнала, и обучающий увидел бы «пустой» результат.
 * Если Initialize не удался, `inLms` останется false и запись в LMS будет
 * отброшена (см. writeState/finish), но интерфейс останется прежним.
 */
export function createLearningRuntime(): LearningRuntime {
  const api = findScorm2004Api();
  return api
    ? new Scorm2004Runtime(new Scorm2004Session(api))
    : new LocalRuntime();
}

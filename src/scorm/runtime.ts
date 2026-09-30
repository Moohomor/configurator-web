/* =====================================================================
 * scorm/runtime.ts
 * Реализации LearningRuntime:
 *   Scorm2004Runtime — работа с LMS через API_1484_11;
 *   LocalRuntime     — автономный режим (dev/превью без LMS).
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

/** События закрытия SCO: на них обязателен Commit, иначе LMS теряет данные. */
const LEAVE_EVENTS = ["pagehide", "beforeunload", "visibilitychange"] as const;

abstract class BaseRuntime {
  protected readonly buffer = new Map<string, InteractionRecord>();
  private readonly leaveHandlers: Array<() => void> = [];

  constructor() {
    for (const event of LEAVE_EVENTS) {
      window.addEventListener(event, () => {
        if (event === "visibilitychange" && !document.hidden) return;
        this.handleLeave();
      });
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
    this.session.initialize();
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

  writeState(state: unknown): void {
    if (!this.inLms || this.finished) return;
    this.session.writeSuspendData(state);
    this.session.set(
      "cmi.session_time",
      formatDuration(this.session.elapsedSeconds),
    );
    this.session.commit();
  }

  finish(result: LessonResult): boolean {
    if (!this.inLms || this.finished) return false;

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
    ok = this.session.set("cmi.exit", result.exit) && ok;
    ok = this.session.commit() && ok;
    ok = this.session.terminate() && ok;
    this.finished = true;
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

const LOCAL_STATE_KEY = "configurator:course-progress";

/** Автономный режим: без LMS, но с тем же интерфейсом. Прогресс живёт
 *  в localStorage, интеракции — в консоли. Используется в dev и превью. */
export class LocalRuntime extends BaseRuntime implements LearningRuntime {
  readonly kind = "local" as const;
  readonly inLms = false;
  readonly label = "Конфигуратор запущен вне LMS — результат не сохраняется";

  override start(): void {
    /* сессии нет */
  }

  readState<T>(fallback: T): T {
    try {
      const raw = localStorage.getItem(LOCAL_STATE_KEY);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  writeState(state: unknown): void {
    try {
      localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
    } catch {
      /* приватный режим браузера — не критично */
    }
  }

  finish(result: LessonResult): boolean {
    const done = this.interactions.filter((i) => i.result === "correct").length;
    console.info(
      `[курс] итог: ${result.score}% — ${result.success}/${result.completion}; ` +
        `выполнено заданий: ${done} из ${this.interactions.length}`,
    );
    return true;
  }
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

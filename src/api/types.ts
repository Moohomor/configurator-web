/* =====================================================================
 * api/types.ts
 * Контракты, через которые приложение общается с внешним миром.
 *
 * Приложение НЕ знает ни про SCORM, ни про JSON-файл каталога: каталог
 * приходит через ModelCatalogSource, обучение — через LearningRuntime.
 * Любая реализация подставляется в composition root (createConfiguratorApp).
 * ===================================================================== */
import type { Model } from "@/configurator/types/models";

/* ---- каталог моделей (галерея) ---------------------------------- */

/** Откуда приложение берёт список моделей. */
export interface ModelCatalogSource {
  load(): Promise<Model[]>;
}

/* ---- обучение (SCORM) -------------------------------------------- */

export type InteractionResult =
  | "correct"
  | "incorrect"
  | "unanticipated"
  | "neutral";

/** Одна запись в cmi.interactions. */
export interface InteractionRecord {
  /** Уникальный в пределах SCO, без пробелов. */
  id: string;
  type: "other" | "choice" | "fill-in" | "true-false" | "performance";
  description: string;
  result: InteractionResult;
  timestamp: string;
}

export type CompletionStatus = "completed" | "incomplete";
export type SuccessStatus = "passed" | "failed" | "unknown";
export type ExitStatus = "normal" | "suspend";

/** Итог сессии обучения. Интеракции runtime держит у себя и отправляет
 *  вместе с итогом — дублировать их здесь не нужно. */
export interface LessonResult {
  score: number;
  min?: number;
  max?: number;
  completion: CompletionStatus;
  success: SuccessStatus;
  exit: ExitStatus;
  /** cmi.location — закладка (id текущего урока). */
  location?: string;
}

/**
 * Всё, что нужно приложению от системы обучения.
 * Реализации: Scorm2004Runtime (в LMS) и LocalRuntime (вне LMS).
 */
export interface LearningRuntime {
  /** "scorm" — работаем с LMS, "local" — автономный режим. */
  readonly kind: "scorm" | "local";
  /** Человеческое описание режима — для панели прогресса. */
  readonly label: string;
  /** Открыть сессию (SCORM Initialize). Идемпотентно. */
  start(): void;
  /** Прочитать сохранённое состояние урока. */
  readState<T>(fallback: T): T;
  /**
   * Сохранить состояние урока.
   * @param json готовый JSON прогресса: сериализует вызывающий
   *   (`serializeProgress`), чтобы правило обрезки по лимиту suspend_data
   *   жило в одном месте и не зависело от SCORM.
   */
  writeState(json: string): void;
  /** Записать интеракцию (уходит в LMS при finish()). */
  recordInteraction(interaction: InteractionRecord): void;
  /** Накопленные интеракции — для отладки и тестов. */
  readonly interactions: readonly InteractionRecord[];
  /** Записать прогресс (score/completion/interactions) и закоммитить, не закрывая сессию. */
  report(result: LessonResult): boolean;
  /** Отправить результат и закрыть сессию. */
  finish(result: LessonResult): boolean;
  /** Подписаться на уход со страницы (commit при закрытии). */
  onLeave(handler: () => void): void;
}

/* ---- сборка приложения -------------------------------------------- */

export interface ConfiguratorAppOptions {
  /** Источник каталога моделей. */
  catalog: ModelCatalogSource;
  /** Система обучения. */
  runtime: LearningRuntime;
  /** id модели: открыть сразу уроком. null/undefined — открыть каталог. */
  lessonId?: string | null;
  /** Селектор контейнера (по умолчанию #app). */
  selector?: string;
}

/* =====================================================================
 * scorm/lessons.ts
 * Декларация заданий и чистая логика подсчёта. Ни Vue, ни SCORM —
 * только данные, поэтому правила оценивания читаются и тестируются
 * отдельно от интерфейса.
 * ===================================================================== */
import type { InteractionRecord } from "@/api/types";
import type { Model } from "@/configurator/types/models";
import type { ConfiguratorEvent } from "@/configurator/events";

/** События конфигуратора, на которые подписан трекер. Определены в
 *  конфигураторе: трекер подписывается на то, что конфигуратор шлёт. */
export type { ConfiguratorEvent } from "@/configurator/events";

export interface TaskDef {
  id: string;
  title: string;
  event: ConfiguratorEvent;
  /** Обязательное задание: без всех обязательных курс не завершён. */
  core: boolean;
  /** Засчитывается только если у модели есть анимация. Определяется
   *  на лету по факту загрузки 3D-сцены, а не флагом в каталоге. */
  onlyWithAnimation?: boolean;
}

export const LESSON_TASKS: readonly TaskDef[] = [
  { id: "open", title: "Открыть урок", event: "model-loaded", core: true },
  { id: "part", title: "Выбрать деталь", event: "part-selected", core: true },
  {
    id: "animation",
    title: "Запустить анимацию",
    event: "animation-played",
    core: false,
    onlyWithAnimation: true,
  },
];

/** Успех при доле выполненных заданий, округлённой вниз. */
export const PASS_PERCENT = 67;

/**
 * За какие уроки отвечает этот SCO.
 *  - "all"    — SCO открыт как каталог, следит за всем курсом
 *                (штатный режим, урок передаётся как ?lesson=);
 *  - "single" — SCO открыт как конкретный урок (lesson-<id>.html).
 */
export type LessonScope = { kind: "all" } | { kind: "single"; lessonId: string };

/** Урок = модель с реальной 3D-моделью. Остальное — заглушки каталога. */
export function isLesson(model: Model): boolean {
  return Boolean(model.path);
}

export function lessonsOf(models: readonly Model[]): Model[] {
  return models.filter(isLesson);
}

export function taskKey(lessonId: string, taskId: string): string {
  return `${lessonId}.${taskId}`;
}

/** Поля прогресса, в которых хранится отметка о выполнении задания. */
export type TimestampField = "openedAt" | "partAt" | "animationAt";

/** Прогресс по одному уроку. */
export interface LessonProgress {
  openedAt: string | null;
  partAt: string | null;
  animationAt: string | null;
  /** Сообщает 3D-сцена при загрузке. */
  hasAnimations: boolean;
}

export type CourseProgress = Record<string, LessonProgress>;

export function emptyLessonProgress(): LessonProgress {
  return {
    openedAt: null,
    partAt: null,
    animationAt: null,
    hasAnimations: false,
  };
}

export interface ScoredTask {
  key: string;
  lessonId: string;
  lessonName: string;
  task: TaskDef;
  done: boolean;
  doneAt: string | null;
}

/** Задания конкретного урока с учётом наличия анимации. */
export function lessonTasks(
  lesson: Model,
  progress: CourseProgress,
): ScoredTask[] {
  const lessonProgress = progress[lesson.id] ?? emptyLessonProgress();
  return LESSON_TASKS.filter(
    (task) => !task.onlyWithAnimation || lessonProgress.hasAnimations,
  ).map((task) => {
    const doneAt =
      task.id === "open"
        ? lessonProgress.openedAt
        : task.id === "part"
          ? lessonProgress.partAt
          : lessonProgress.animationAt;
    return {
      key: taskKey(lesson.id, task.id),
      lessonId: lesson.id,
      lessonName: lesson.name,
      task,
      done: Boolean(doneAt),
      doneAt: doneAt ?? null,
    };
  });
}

export interface CourseScore {
  /** Процент по обязательным заданиям — он и уходит в cmi.score.raw. */
  score: number;
  done: number;
  total: number;
  /** Выполнено дополнительных (бонусных) заданий. */
  bonusDone: number;
  bonusTotal: number;
  /** Все обязательные задания выполнены. */
  completed: boolean;
  passed: boolean;
}

const EMPTY_SCORE: CourseScore = {
  score: 0,
  done: 0,
  total: 0,
  bonusDone: 0,
  bonusTotal: 0,
  completed: false,
  passed: false,
};

/**
 * Оценка по урокам в области ответственности SCO.
 *
 * В знаменатель входят **только обязательные** задания. Бонус (анимация)
 * засчитывается не у всех моделей и выясняется лишь после загрузки сцены,
 * поэтому если бы он входил в знаменатель, итог «2 из 16» превращался бы в
 * «2 из 17» просто от того, что обучающий посмотрел вторую модель. Для
 * отслеживания прогресса нужна стабильная правая часть дроби.
 */
export function scoreProgress(
  lessons: readonly Model[],
  progress: CourseProgress,
  scope: LessonScope,
): CourseScore {
  const scoped =
    scope.kind === "single"
      ? lessons.filter((lesson) => lesson.id === scope.lessonId)
      : lessons;

  if (scoped.length === 0) return EMPTY_SCORE;

  let done = 0;
  let total = 0;
  let bonusDone = 0;
  let bonusTotal = 0;

  for (const lesson of scoped) {
    for (const scored of lessonTasks(lesson, progress)) {
      if (scored.task.core) {
        total += 1;
        if (scored.done) done += 1;
      } else {
        bonusTotal += 1;
        if (scored.done) bonusDone += 1;
      }
    }
  }

  const score = total === 0 ? 0 : Math.round((done / total) * 100);
  return {
    score,
    done,
    total,
    bonusDone,
    bonusTotal,
    completed: total > 0 && done === total,
    passed: score >= PASS_PERCENT,
  };
}

/**
 * Сериализует прогресс в строку не длиннее `limit` (лимит cmi.suspend_data
 * в SCORM 2004 — 4096 символов).
 *
 * Обрезать строку нельзя: получится невалидный JSON, и при следующем
 * запуске весь прогресс молча пропадёт. Поэтому при нехватке места
 * отбрасываются уроки — сначала незаметенные, затем самые давние.
 */
export function serializeProgress(
  progress: CourseProgress,
  limit: number,
): string {
  const json = JSON.stringify(progress);
  if (json.length <= limit) return json;

  const activityOf = (lessonProgress: LessonProgress): number => {
    const stamps = [
      lessonProgress.openedAt,
      lessonProgress.partAt,
      lessonProgress.animationAt,
    ].filter((value): value is string => Boolean(value));
    if (!stamps.length) return 0;
    return Math.max(...stamps.map((value) => Date.parse(value) || 0));
  };

  const oldestFirst = Object.entries(progress).sort(
    ([, a], [, b]) => activityOf(a) - activityOf(b),
  );

  const kept: CourseProgress = { ...progress };
  for (const [lessonId] of oldestFirst) {
    delete kept[lessonId];
    const trimmed = JSON.stringify(kept);
    if (trimmed.length <= limit) return trimmed;
  }
  return "{}";
}

/** Полный набор интеракций по урокам в области ответственности SCO. */
export function buildInteractions(
  lessons: readonly Model[],
  progress: CourseProgress,
  scope: LessonScope,
  now = new Date().toISOString(),
): InteractionRecord[] {
  const scoped =
    scope.kind === "single"
      ? lessons.filter((lesson) => lesson.id === scope.lessonId)
      : lessons;

  const interactions: InteractionRecord[] = [];
  for (const lesson of scoped) {
    for (const scored of lessonTasks(lesson, progress)) {
      interactions.push({
        id: scored.key,
        type: "other",
        description: `${scored.lessonName}: ${scored.task.title}`,
        result: scored.done ? "correct" : "incorrect",
        timestamp: scored.doneAt ?? now,
      });
    }
  }
  return interactions;
}

/* =====================================================================
 * scorm/tracker.ts
 * Связка «события конфигуратора → задания → система обучения».
 *
 * Раньше трекер угадывал действия по CSS-селекторам и тексту карточек
 * внутри iframe приложения. Теперь UI сам сообщает семантические
 * события (открыт урок, выбрана деталь, запущена анимация), а трекер
 * превращает их в задания и cmi.interactions.
 * ===================================================================== */
import {
  computed,
  reactive,
  ref,
  type ComputedRef,
  type Ref,
} from "vue";
import type { LearningRuntime, LessonResult } from "@/api/types";
import type { Model } from "@/configurator/types/models";
import { currentLessonId } from "./lesson";
import { SUSPEND_DATA_LIMIT } from "./scorm2004";
import {
  buildInteractions,
  emptyLessonProgress,
  lessonTasks,
  LESSON_TASKS,
  PASS_PERCENT,
  scoreProgress,
  serializeProgress,
  taskKey,
  type ConfiguratorEvent,
  type CourseProgress,
  type CourseScore,
  type LessonProgress,
  type LessonScope,
  type ScoredTask,
  type TimestampField,
} from "./lessons";

/** Куда в прогрессе урока писать отметку о выполнении задания. */
const TIMESTAMP_FIELD: Record<string, TimestampField | undefined> = {
  open: "openedAt",
  part: "partAt",
  animation: "animationAt",
};

export interface TrackerOptions {
  runtime: LearningRuntime;
  /** Все уроки каталога (модели с 3D). */
  lessons: Model[];
  scope: LessonScope;
}

export interface LessonTracker {
  readonly scope: LessonScope;
  readonly lessons: Model[];
  readonly progress: CourseProgress;
  readonly score: ComputedRef<CourseScore>;
  readonly reported: Ref<boolean>;
  readonly lastResult: Ref<LessonResult | null>;
  readonly reportedToLms: Ref<boolean>;
  tasksOf(lesson: Model): ScoredTask[];
  mark(event: ConfiguratorEvent, lessonId: string): void;
  noteAnimations(lessonId: string, hasAnimations: boolean): void;
  finish(): LessonResult | null;
}

export function createTracker(options: TrackerOptions): LessonTracker {
  const { runtime, lessons, scope } = options;

  const progress = reactive<CourseProgress>(runtime.readState<CourseProgress>({}));
  const reported = ref(false);
  const lastResult = ref<LessonResult | null>(null);
  const reportedToLms = ref(false);

  const score = computed(() => scoreProgress(lessons, progress, scope));

  function lessonById(lessonId: string): Model | undefined {
    return lessons.find((lesson) => lesson.id === lessonId);
  }

  function ensureProgress(lessonId: string): LessonProgress {
    if (!progress[lessonId]) progress[lessonId] = emptyLessonProgress();
    return progress[lessonId];
  }

  function persist(): void {
    runtime.writeState(serializeProgress({ ...progress }, SUSPEND_DATA_LIMIT));
  }

  /** Текущий итог — тот же объект, что уйдёт в cmi.* при report()/finish(). */
  function snapshot(exit: LessonResult["exit"]): LessonResult {
    const current = score.value;
    return {
      score: current.score,
      min: 0,
      max: 100,
      completion: current.completed ? "completed" : "incomplete",
      success:
        current.score >= PASS_PERCENT
          ? "passed"
          : current.score > 0
            ? "failed"
            : "unknown",
      exit,
      location: currentLessonId() ?? undefined,
    };
  }

  /**
   * Отправить прогресс в LMS, не закрывая сессию.
   *
   * Раньше оценка уходила только по кнопке «завершить»: до неё LMS
   * показывала 0/0, а если обучающий закрыл вкладку — терял всё.
   */
  function report(): void {
    if (reported.value) return;
    runtime.report(snapshot("suspend"));
  }

  /** Отметить событие конфигуратора. Повторные отметки игнорируются. */
  function mark(event: ConfiguratorEvent, lessonId: string): void {
    const lesson = lessonById(lessonId);
    if (!lesson || reported.value) return;

    const task = LESSON_TASKS.find((item) => item.event === event);
    if (!task) return;

    const lessonProgress = ensureProgress(lessonId);
    if (task.onlyWithAnimation && !lessonProgress.hasAnimations) return;

    const field = TIMESTAMP_FIELD[task.id];
    if (!field || lessonProgress[field]) return;

    const timestamp = new Date().toISOString();
    lessonProgress[field] = timestamp;
    runtime.recordInteraction({
      id: taskKey(lessonId, task.id),
      type: "other",
      description: `${lesson.name}: ${task.title}`,
      result: "correct",
      timestamp,
    });
    persist();
    report();
  }

  /** 3D-сцена сообщила, есть ли анимация: от этого зависит состав заданий. */
  function noteAnimations(lessonId: string, hasAnimations: boolean): void {
    if (!lessonById(lessonId)) return;
    const lessonProgress = ensureProgress(lessonId);
    if (lessonProgress.hasAnimations === hasAnimations) return;
    lessonProgress.hasAnimations = hasAnimations;
    persist();
  }

  function finish(): LessonResult | null {
    if (reported.value) return null;

    const now = new Date().toISOString();
    // Полный список интеракций, включая невыполненные: буфер runtime
    // обновляется по id, поэтому «correct» не затирается.
    for (const interaction of buildInteractions(lessons, progress, scope, now)) {
      runtime.recordInteraction(interaction);
    }

    const result = snapshot(score.value.completed ? "normal" : "suspend");

    lastResult.value = result;
    reported.value = true;
    reportedToLms.value = runtime.finish(result);
    return result;
  }

  // Уход со страницы: если обязательные задания закрыты — отправляем итог
  // сразу, иначе runtime сам запишет состояние и пометит сессию как suspend.
  runtime.onLeave(() => {
    if (!reported.value && score.value.completed) finish();
  });

  return {
    scope,
    lessons,
    progress,
    score,
    reported,
    lastResult,
    reportedToLms,
    tasksOf: (lesson: Model) => lessonTasks(lesson, progress),
    mark,
    noteAnimations,
    finish,
  };
}

/* =====================================================================
 * scorm/lesson.ts
 * Роутинг «каталог ↔ урок» и граница ответственности SCO.
 *
 * Два способа попасть на урок, оба поддерживаются всегда:
 *   ?lesson=<id>            — LMS поддержала <parameters> в манифесте
 *                             (штатный режим упаковки);
 *   window.__LESSON__ = {…} — встроено в сгенерированный lesson-<id>.html
 *                             (режим --lessons=files).
 *
 * Переходы внутри приложения делаются через history.pushState, без
 * перезагрузки: перезагрузка SCO вызвала бы второй Initialize в той же
 * сессии LMS.
 * ===================================================================== */
import type { LessonScope } from "./lessons";

export interface InjectedLesson {
  id: string;
}

declare global {
  interface Window {
    /** Вставляется в lesson-<id>.html плагином сборки. */
    __LESSON__?: InjectedLesson;
  }
}

function search(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** id урока, заданный при открытии SCO, иначе null (каталог). */
export function currentLessonId(): string | null {
  return window.__LESSON__?.id ?? search().get("lesson") ?? null;
}

/**
 * SCO, открытый как отдельный урок, отвечает только за него.
 * SCO, открытый как каталог, отвечает за весь курс.
 */
export function currentScope(): LessonScope {
  const injected = window.__LESSON__;
  if (injected?.id) return { kind: "single", lessonId: injected.id };
  return { kind: "all" };
}

/** Ссылка на урок — для <a href> и средств доступности. */
export function lessonHref(id: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("lesson", id);
  return url.pathname + url.search + url.hash;
}

/** Ссылка на каталог (текущий документ без параметра урока). */
export const catalogHref: string =
  (() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("lesson");
    return url.pathname + url.search + url.hash;
  })();

type RouteListener = () => void;
const listeners = new Set<RouteListener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Подписка на смену урока (кнопки «назад/вперёд» браузера). */
export function onRouteChange(listener: RouteListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function navigate(lessonId: string | null): void {
  const url = new URL(window.location.href);
  if (lessonId) {
    url.searchParams.set("lesson", lessonId);
  } else {
    url.searchParams.delete("lesson");
  }
  if (url.href === window.location.href) {
    notify();
    return;
  }
  if (window.history?.pushState) {
    window.history.pushState({ lesson: lessonId }, "", url.href);
    notify();
  } else {
    window.location.href = url.href;
  }
}

export function goToLesson(id: string): void {
  navigate(id);
}

export function goToCatalog(): void {
  navigate(null);
}

window.addEventListener("popstate", notify);

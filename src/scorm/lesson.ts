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

/**
 * Имя HTML-точки входа каталога.
 *
 * В режиме `--lessons=files` SCO открыт как `lesson-<id>.html`, и путь
 * «текущий документ без параметра» вёл бы сам в себя: каталог недостижим,
 * потому что `currentLessonId()` сперва смотрит в `window.__LESSON__`.
 * Поэтому адреса всегда строим от `index.html`.
 */
const CATALOG_DOC = "index.html";

function buildHref(lessonId: string | null): string {
  const url = new URL(window.location.href);
  // Один и тот же документ может содержать и каталог, и урок (режим params).
  const inCatalogDocument = url.pathname.endsWith(`/${CATALOG_DOC}`);
  url.pathname = inCatalogDocument
    ? url.pathname
    : url.pathname.replace(/[^/]*$/, CATALOG_DOC);

  if (lessonId) {
    url.searchParams.set("lesson", lessonId);
  } else {
    url.searchParams.delete("lesson");
  }
  return url.pathname + url.search + url.hash;
}

/** Ссылка на урок — для <a href> и средств доступности. */
export function lessonHref(id: string): string {
  return buildHref(id);
}

/** Ссылка на каталог. */
export function catalogHref(): string {
  return buildHref(null);
}

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
  const target = buildHref(lessonId);

  // В режиме --lessons=files смена урока означает смену документа SCO:
  // другого способа перейти в каталог просто нет. Reload здесь законен —
  // это отдельная SCO-сессия, а не второй Initialize в одной.
  const currentDocument = new URL(window.location.href).pathname;
  const targetDocument = target.split("?")[0] ?? target;
  if (currentDocument !== targetDocument) {
    window.location.href = target;
    return;
  }

  if (target === buildHref(currentLessonId())) {
    notify();
    return;
  }

  if (window.history?.pushState) {
    window.history.pushState({ lesson: lessonId }, "", target);
    notify();
  } else {
    window.location.href = target;
  }
}

export function goToLesson(id: string): void {
  navigate(id);
}

export function goToCatalog(): void {
  navigate(null);
}

window.addEventListener("popstate", notify);

/* =====================================================================
 * scorm/lesson.ts
 * Роутинг «каталог ↔ урок», граница ответственности SCO и режим
 * встраивания в сторонний курс (embedMode).
 *
 * Два способа попасть на урок, оба поддерживаются всегда:
 *   ?lesson=<id>            — LMS поддержала <parameters> в манифесте
 *                             (штатный режим упаковки);
 *   window.__LESSON__ = {…} — встроено в сгенерированные lesson-<id>.html
 *                             и embed-<id>.html.
 *
 * Переходы внутри приложения делаются через history.pushState, без
 * перезагрузки: перезагрузка SCO вызвала бы второй Initialize в той же
 * сессии LMS (в режиме embed этой сессии нет — см. navigate).
 * ===================================================================== */
import type { LessonScope } from "./lessons";

export interface InjectedLesson {
  id: string;
}

declare global {
  interface Window {
    /** Вставляется в lesson-<id>.html плагином сборки. */
    __LESSON__?: InjectedLesson;
    /** Вставлено в embed-<id>.html: лёгкий вьюер без chrome урока. */
    __VIEWER__?: boolean;
    /** Вставлено упаковщиком в контент-zip: страница из контентного
     *  пакета для стороннего курса, SCORM API трогать нельзя. */
    __CONTENT_EMBED__?: boolean;
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
 * Режим встраивания в сторонний SCORM-курс.
 *
 *   "viewer" — embed-<id>.html: лёгкий вьюер «посреди текста»,
 *              без шапки урока и без панели заданий;
 *   "lesson" — полный урок/каталог из контент-zip (флаг вшит в HTML)
 *              или любая страница с ?embed=1;
 *   null     — обычная работа: в LMS это SCO, вне LMS — dev/превью.
 *
 * Признак явный и не выводится из наличия API_1484_11: встроенный фрейм
 * всегда лежит внутри SCO чужого курса, и «нашли API» означает «нашли
 * ЧУЖУЮ сессию» — инициализировать её нашим Initialize нельзя.
 */
export type EmbedMode = "viewer" | "lesson";

export function embedMode(): EmbedMode | null {
  if (window.__VIEWER__) return "viewer";
  if (window.__CONTENT_EMBED__) return "lesson";
  const raw = search().get("embed");
  if (raw === null || raw === "0" || raw === "false") return null;
  return raw === "viewer" ? "viewer" : "lesson";
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
  //
  // В dev и preview каталог открыт по «/» (сервер отдаёт тот же
  // index.html), в SCORM-пакете — по «index.html». Форму пути надо
  // сохранить: если превратить «/» в «/index.html», сравнение документов
  // в navigate() решит, что нужен переход на другой документ, и вместо
  // pushState останется console.warn.
  const isDirectory = url.pathname.endsWith("/");
  const inCatalogDocument =
    isDirectory || url.pathname.endsWith(`/${CATALOG_DOC}`);
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

/**
 * Переход внутри текущего документа — только через pushState.
 *
 * `window.location.href` здесь недопустим: смена документа внутри
 * SCO-фрейма перезагружает приложение, а новая загрузка зовёт
 * Initialize второй раз в одной сессии LMS. Для SCORM это нарушение
 * протокола: HCM после такого считает попытку закрытой и уроки
 * перестают открываться. Смена урока — только меню курса.
 *
 * В режиме встраивания и вне LMS запрет снимается: SCO-сессии там нет
 * (EmbedRuntime и LocalRuntime не вызывают Initialize), поэтому смену
 * документа разрешает `allowDocumentChange`. Так ходит кнопка
 * «К каталогу» вне LMS: каталог лежит в index.html, и из
 * lesson-<id>.html это честная загрузка другого документа.
 */
export interface NavigateOptions {
  /**
   * Разрешить смену HTML-документа. Только вне SCORM: второго
   * Initialize там быть не может. Внутри LMS флаг не выставляется.
   */
  allowDocumentChange?: boolean;
}

function navigate(
  lessonId: string | null,
  options: NavigateOptions = {},
): void {
  const target = buildHref(lessonId);

  const currentDocument = new URL(window.location.href).pathname;
  const targetDocument = target.split("?")[0] ?? target;
  if (currentDocument !== targetDocument) {
    if (options.allowDocumentChange || embedMode()) {
      window.location.href = target;
      return;
    }
    console.warn(
      "[курс] переход между документами внутри SCO запрещён: это дало бы " +
        "второй Initialize. Открывайте уроки из меню курса.",
    );
    return;
  }

  if (target === buildHref(currentLessonId())) {
    notify();
    return;
  }

  if (window.history?.pushState) {
    window.history.pushState({ lesson: lessonId }, "", target);
    notify();
  }
}

export function goToLesson(
  id: string,
  options: NavigateOptions = {},
): void {
  navigate(id, options);
}

export function goToCatalog(options: NavigateOptions = {}): void {
  navigate(null, options);
}

window.addEventListener("popstate", notify);

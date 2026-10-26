/**
 * Фейковая LMS: реализация SCORM 2004 Run-Time API (`API_1484_11`),
 * которая записывает все SetValue/Commit/Terminate в `window.__cmiLog`.
 *
 * Ставится в родительское окно (LMS), SCO открывается во вложенном iframe —
 * ровно как в настоящей системе, включая поиск API вверх по цепочке
 * родительских окон.
 */
import type { Frame, Page } from "@playwright/test";

export type CmiLogEntry = {
  method: "Initialize" | "SetValue" | "Commit" | "Terminate" | "GetValue";
  element?: string;
  value?: string;
};

declare global {
  interface Window {
    API_1484_11?: object;
    __cmiLog: CmiLogEntry[];
    __cmiValues: Record<string, string>;
    __cmiSession: { initialized: boolean; terminated: boolean; commits: number };
    /** Метка загрузки документа: меняется при перезагрузке SCO. */
    __docStamp?: string;
  }
}

/** Origin собранного приложения — тот же, что baseURL в playwright.config. */
export const LMS_ORIGIN = "http://127.0.0.1:5184";

export const FAKE_API = `
window.__cmiLog = [];
window.__cmiValues = {};
window.__cmiSession = { initialized: false, terminated: false, commits: 0 };

function record(method, element, value) {
  window.__cmiLog.push({ method: method, element: element, value: value });
}

window.API_1484_11 = {
  Initialize: function () {
    if (window.__cmiSession.initialized) return "false"; // второй Initialize — ошибка
    window.__cmiSession.initialized = true;
    record("Initialize");
    return "true";
  },
  GetValue: function (element) {
    record("GetValue", element);
    return window.__cmiValues[element] || "";
  },
  SetValue: function (element, value) {
    window.__cmiValues[element] = value;
    record("SetValue", element, value);
    return "true";
  },
  Commit: function () {
    window.__cmiSession.commits += 1;
    record("Commit");
    return "true";
  },
  Terminate: function () {
    window.__cmiSession.terminated = true;
    record("Terminate");
    return "true";
  },
  GetLastError: function () { return "0"; },
  GetErrorString: function () { return ""; },
  GetDiagnostic: function () { return ""; }
};
`;

/**
 * Открывает LMS-страницу с фейковым API и вложенным SCO.
 *
 * Страница-LMS отдаётся перехватом запроса (в дистрибутиве такого файла
 * нет), но с тем же origin, что и SCO: иначе iframe был бы кросс-доменным
 * и приложение не смогло бы достучаться до `parent.API_1484_11`.
 */
export async function openScoInLms(
  page: Page,
  scoPath: string,
  options: { width?: number; height?: number } = {},
): Promise<void> {
  const { width = 1280, height = 800 } = options;

  // Метка загрузки документа: init-скрипт выполняется в каждом фрейме перед
  // его собственными скриптами, поэтому смена метки = перезагрузка SCO.
  await page.addInitScript(() => {
    window.__docStamp = Math.random().toString(36).slice(2);
  });

  await page.route(`${LMS_ORIGIN}/__lms.html`, (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: lmsPage(scoPath, width, height),
    }),
  );

  await page.goto(`${LMS_ORIGIN}/__lms.html`);

  // Ждём API: иначе следующая проверка упала бы с невнятным undefined.
  await page.waitForFunction(
    () => typeof window.API_1484_11 === "object",
    undefined,
    { timeout: 15_000 },
  );

  const sco = page.frameLocator("#sco");
  await sco.locator(".app").waitFor({ state: "visible", timeout: 60_000 });
}

function lmsPage(scoPath: string, width: number, height: number): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>LMS (симулятор)</title>
    <script>${FAKE_API}</script>
  </head>
  <body style="margin:0">
    <iframe
      id="sco"
      src="${LMS_ORIGIN}${scoPath}"
      style="width:${width}px;height:${height}px;border:0"
    ></iframe>
  </body>
</html>`;
}

/** Фрейм самого SCO (не LMS). */
export function scoFrame(page: Page): Frame {
  const frames = page.frames().filter((frame) => frame !== page.mainFrame());
  if (frames.length !== 1) {
    throw new Error(`Ожидался один фрейм SCO, найдено: ${frames.length}`);
  }
  return frames[0]!;
}

/** Метка текущей загрузки документа SCO. */
export async function scoDocStamp(page: Page): Promise<string | undefined> {
  return scoFrame(page).evaluate(() => window.__docStamp);
}

/** Значения cmi, записанные SCO. */
export async function cmiValues(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => window.__cmiValues);
}

export async function cmiLog(page: Page): Promise<CmiLogEntry[]> {
  return page.evaluate(() => window.__cmiLog);
}
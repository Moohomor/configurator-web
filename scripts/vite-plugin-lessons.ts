/* =====================================================================
 * vite-plugin-lessons.ts
 * Генерирует отдельные HTML-точки входа:
 *
 *   lesson-<id>.html — урок (SCO в упаковке, прямая ссылка на урок);
 *   embed-<id>.html  — лёгкий вьюер для вставки в сторонний SCORM-курс:
 *                      тот же бандл, но `window.__VIEWER__ = true`, из-за
 *                      чего шапка урока и панель заданий скрыты, а
 *                      runtime — EmbedRuntime (SCORM API не трогается).
 *
 * Оба файла пишутся всегда: они используются в упаковке (один <resource>
 * на пункт меню) и в dev/превью для проверки прямой ссылки на урок.
 * ===================================================================== */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { readLessons } from "./catalog.mjs";

interface LessonEntry {
  id: string;
  name: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Собирает HTML урока на основе уже собранного index.html: те же теги
 *  со ссылками на бандл и стили, тот же #app. */
function renderLessonHtml(
  lesson: LessonEntry,
  assetTags: string,
  viewer = false,
): string {
  const payload = JSON.stringify({ id: lesson.id });
  const viewerFlag = viewer
    ? "\n    <script>window.__VIEWER__ = true;</script>"
    : "";
  const title = viewer
    ? `${escapeHtml(lesson.name)} — 3D-модель`
    : `${escapeHtml(lesson.name)} — 3D-конфигуратор`;
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script>window.__LESSON__ = ${payload};</script>${viewerFlag}
    ${assetTags}
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
`;
}

const ASSET_TAG_RE =
  /<link[^>]+href="[^"]+"[^>]*>|<script[^>]+src="[^"]+"[^>]*><\/script>/g;

export function scormLessonEntries(catalogPath: string): Plugin {
  let outDir = "dist";

  return {
    name: "scorm-lesson-entries",
    apply: "build",

    configResolved(config: ResolvedConfig) {
      outDir = resolve(config.root, config.build.outDir);
    },

    closeBundle() {
      const indexPath = join(outDir, "index.html");
      if (!existsSync(indexPath)) return;

      const indexHtml = readFileSync(indexPath, "utf8");
      const assetTags = [...indexHtml.matchAll(ASSET_TAG_RE)]
        .map((match) => match[0])
        .join("\n    ");

      const lessons = readLessons(catalogPath);
      for (const lesson of lessons) {
        writeFileSync(
          join(outDir, `lesson-${lesson.id}.html`),
          renderLessonHtml(lesson, assetTags),
          "utf8",
        );
        writeFileSync(
          join(outDir, `embed-${lesson.id}.html`),
          renderLessonHtml(lesson, assetTags, true),
          "utf8",
        );
      }
    },
  };
}

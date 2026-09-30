/* =====================================================================
 * vite-plugin-lessons.ts
 * Генерирует отдельные HTML-точки входа lesson-<id>.html — по одной на
 * каждую модель с реальной 3D-моделью. Нужны для режима упаковки
 * `--lessons=files`, где каждая модель — отдельный SCO со своим href.
 *
 * В режиме `--lessons=params` (по умолчанию) эти файлы не нужны: LMS
 * запускает index.html, а урок передаётся query-параметром (?lesson=).
 * Файлы всё равно генерируются — они бесплатны (200 байт на урок) и
 * используются в dev/превью для проверки прямой ссылки на урок.
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
function renderLessonHtml(lesson: LessonEntry, assetTags: string): string {
  const payload = JSON.stringify({ id: lesson.id });
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(lesson.name)} — 3D-конфигуратор</title>
    <script>window.__LESSON__ = ${payload};</script>
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
      }
    },
  };
}

/* =====================================================================
 * catalog.mjs
 * Чтение каталога моделей — общий источник правды для сборки.
 *
 * Используется и плагином сборки (генерация lesson-<id>.html), и
 * упаковщиком SCORM (перечень <item> в манифесте). Обычный JS без типов,
 * чтобы его можно было импортировать и из vite.config.ts, и из
 * package-scorm.mjs без experimental-флагов Node.
 * ===================================================================== */
import { readFileSync } from "node:fs";

/**
 * Урок = модель с реальной 3D-моделью. Остальные записи каталога —
 * заглушки с превью, отдельными уроками они не являются.
 *
 * @param {string} catalogPath путь к models.json
 * @returns {{id: string, name: string}[]}
 */
export function readLessons(catalogPath) {
  const records = JSON.parse(readFileSync(catalogPath, "utf8"));
  if (!Array.isArray(records)) {
    throw new Error(`Каталог ${catalogPath} должен быть массивом моделей`);
  }
  return records
    .filter((record) => typeof record.path === "string" && record.path)
    .map((record) => ({ id: record.id, name: record.name }));
}

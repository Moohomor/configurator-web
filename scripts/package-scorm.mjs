#!/usr/bin/env node
/* =====================================================================
 * package-scorm.mjs
 * Собирает SCORM 2004 (4th Edition) пакет из dist/:
 *   dist/ -> scorm-package/ + configurator-web-scorm2004.zip
 *
 * Структура одна: каждый пункт меню курса — отдельный SCO.
 *
 *   - «Каталог моделей» -> index.html, обзор всего курса;
 *   - каждый урок       -> lesson-<id>.html, свой <resource>, своя
 *                          оценка и своя запись в журнале LMS.
 *
 * Раньше был ещё режим `--lessons=params`: один SCO на весь курс, урок
 * передавался как `<parameters>?lesson=<id>`. На WebSoft HCM он не
 * работает — импорт проходит, а все уроки молча открывают каталог, — и
 * он удалён вместе с флагом: держать два режима ради неработающего не
 * было смысла.
 *
 * imsmanifest.xml генерируется из содержимого dist, новые модели и
 * текстуры попадают в пакет сами.
 * ===================================================================== */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { readLessons } from "./catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "scorm-package");
const CATALOG = join(ROOT, "src", "catalog", "models.json");

const ZIP = join(ROOT, "configurator-web-scorm2004.zip");

const TITLE = "3D-конфигуратор подвижного состава";
const CATALOG_TITLE = "Каталог моделей";
const ID = "configurator_web_scorm2004";
const SCHEMA = "adlscorm";
const SCHEMA_VERSION = "2004 4th Edition";

/* ---------- вспомогательное ---------- */

function walk(dir, base, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, base, acc);
    } else {
      acc.push(relative(base, full).split(sep).join("/"));
    }
  }
  return acc;
}

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* ---------- imsmanifest.xml ---------- */

/**
 * @param {string[]} files все файлы пакета относительно корня
 * @param {{id: string, name: string}[]} lessons уроки = модели с 3D
 */
function buildManifest(files, lessons) {
  const fileTags = files
    .map((file) => `      <file href="${xmlEscape(file)}"/>`)
    .join("\n");

  // Каталог — входная точка курса: обзор моделей и общий прогресс.
  const catalogResource = `    <resource identifier="res-catalog" type="webcontent" adlcp:scormType="sco" href="index.html">
${fileTags}
    </resource>`;

  // Каждый урок — свой SCO: своя оценка, своя запись в журнале LMS.
  const lessonResources = lessons
    .map(
      (lesson, index) => `    <resource identifier="res-lesson-${
        index + 1
      }" type="webcontent" adlcp:scormType="sco" href="lesson-${xmlEscape(
        lesson.id,
      )}.html">
${fileTags}
    </resource>`,
    )
    .join("\n");

  const resources = `${catalogResource}\n${lessonResources}`;

  const items = [
    `      <item identifier="item-catalog" identifierref="res-catalog">
        <title>${xmlEscape(CATALOG_TITLE)}</title>
      </item>`,
    ...lessons.map(
      (lesson, index) => `      <item identifier="item-lesson-${
        index + 1
      }" identifierref="res-lesson-${index + 1}">
        <title>${xmlEscape(lesson.name)}</title>
      </item>`,
    ),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- SCORM 2004 4th Edition Content Package.
     Отдельный SCO на каждый пункт меню курса: каталог + уроки. -->
<manifest identifier="${ID}"
    xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
    xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
    xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
    xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
    xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
    xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                        http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                        http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                        http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                        http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>${SCHEMA}</schema>
    <schemaversion>${SCHEMA_VERSION}</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:identifier>
          <imsmd:entry>${ID}</imsmd:entry>
        </imsmd:identifier>
        <imsmd:title>
          <imsmd:string xml:lang="ru">${xmlEscape(TITLE)}</imsmd:string>
        </imsmd:title>
        <imsmd:language>ru</imsmd:language>
        <imsmd:description>
          <imsmd:string xml:lang="ru">3D-конфигуратор подвижного состава: ${lessons.length} моделей локомотивов, вагонов и деталей с возможностью просмотра, настройки текстур, освещения и анимаций.</imsmd:string>
        </imsmd:description>
      </imsmd:general>
      <imsmd:lifeCycle>
        <imsmd:contribute>
          <imsmd:role>
            <imsmd:value>author</imsmd:value>
          </imsmd:role>
          <imsmd:entity><imsmd:vcard>Moohomor/configurator-web</imsmd:vcard></imsmd:entity>
        </imsmd:contribute>
      </imsmd:lifeCycle>
      <imsmd:technical>
        <imsmd:format>text/html</imsmd:format>
      </imsmd:technical>
      <imsmd:educational>
        <imsmd:intendedEndUserRole>
          <imsmd:value>learner</imsmd:value>
        </imsmd:intendedEndUserRole>
      </imsmd:educational>
    </imsmd:lom>
  </metadata>

  <organizations default="org-main">
    <organization identifier="org-main">
      <title>${xmlEscape(TITLE)}</title>
${items}
    </organization>
  </organizations>

  <resources>
${resources}
  </resources>
</manifest>
`;
}

/* ---------- сборка ---------- */

if (!existsSync(DIST)) {
  console.error(
    `Ошибка: не найдена папка сборки ${DIST}. Сначала выполните npm run build.`,
  );
  process.exit(1);
}

const lessons = readLessons(CATALOG);
if (lessons.length === 0) {
  console.error("Ошибка: в каталоге нет моделей с 3D — нечего упаковывать.");
  process.exit(1);
}

const missing = lessons
  .filter((lesson) => !existsSync(join(DIST, `lesson-${lesson.id}.html`)))
  .map((lesson) => lesson.id);
if (missing.length) {
  console.error(
    `Ошибка: в dist нет файлов уроков: ${missing.join(", ")}.\n` +
      "Пересоберите приложение (npm run build).",
  );
  process.exit(1);
}

console.log("Сканирую собранное приложение...");
const files = walk(DIST, DIST);
console.log(`Файлов в пакете: ${files.length}, уроков: ${lessons.length}`);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log("Копирую файлы в scorm-package/ ...");
cpSync(DIST, OUT, { recursive: true });

console.log("Генерирую imsmanifest.xml ...");
writeFileSync(
  join(OUT, "imsmanifest.xml"),
  buildManifest(files, lessons),
  "utf8",
);

/* ---------- ZIP-архив ---------- */

console.log("Создаю ZIP-архив ...");
if (existsSync(ZIP)) rmSync(ZIP, { force: true });

// Только Python zipfile: PowerShell Compress-Archive и .NET ZipFile
// пишут записи с обратными слэшами, и LMS на Linux такой пакет не
// импортирует. Не заменять.
let zipOk = true;
try {
  execFileSync(
    "python",
    [
      "-c",
      "import zipfile,os; src='scorm-package'; out='configurator-web-scorm2004.zip'; z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f),src).replace(chr(92),'/')) for r,_,fs in os.walk(src) for f in fs]; z.close()",
    ],
    { cwd: ROOT, stdio: "ignore" },
  );
} catch {
  zipOk = existsSync(ZIP);
}
if (!zipOk) {
  console.warn("  Не удалось создать ZIP автоматически. Создайте вручную:");
  console.warn(
    "  Compress-Archive -Path scorm-package\\* -DestinationPath configurator-web-scorm2004.zip",
  );
}

console.log("Готово:");
console.log(`  Пакет (распакованный): ${OUT}`);
console.log(`  Файлов: ${files.length + 1}`);
console.log(`  ZIP: ${ZIP} (${(existsSync(ZIP) ? statSync(ZIP).size / 1048576 : 0).toFixed(1)} MB)`);

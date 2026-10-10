#!/usr/bin/env node
/* =====================================================================
 * package-scorm.mjs
 * Собирает дистрибутивы из dist/ — по режиму (аргумент команды):
 *
 *   scorm (по умолчанию, npm run build:scorm)
 *     scorm-package/ + configurator-web-scorm2004.zip
 *     — курс для импорта в LMS, с imsmanifest.xml.
 *
 *   embed (npm run build:embed)
 *     content-package/ + configurator-content.zip
 *      — тот же dist БЕЗ манифеста, в HTML-точки входа вшит флаг
 *      window.__CONTENT_EMBED__. Это готовый материал для встраивания
 *      в сторонний SCORM-курс: файлы загружаются в LMS как контент,
 *      и в чужие уроки вставляются iframe'ы на lesson-<id>.html
 *      (полный урок) или embed-<id>.html (лёгкий вьюер «посреди
 *      текста»). Флаг вшит в файл, а не в query-параметр, чтобы его
 *      нельзя было забыть: без него страница нашла бы API_1484_11 в
 *      родителях и открыла бы Initialize поверх чужой SCO-сессии.
 *
 *   all — оба пакета (в CI, для локальной проверки разом).
 *
 * Структура SCORM-пакета одна: каждый пункт меню курса — отдельный SCO.
 *
 *   - «Каталог моделей» -> index.html, обзор всего курса;
 *   - каждый урок       -> lesson-<id>.html, свой <resource>, своя
 *                          оценка и своя запись в журнале LMS.
 *
 * imsmanifest.xml генерируется из содержимого dist, новые модели и
 * текстуры попадают в пакет сами.
 * ===================================================================== */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
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
const CONTENT = join(ROOT, "content-package");
const CATALOG = join(ROOT, "src", "catalog", "models.json");

const ZIP = join(ROOT, "configurator-web-scorm2004.zip");
const CONTENT_ZIP = join(ROOT, "configurator-content.zip");

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

  <organizations default="tmh-3d-configurator">
    <organization identifier="tmh-3d-configurator">
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

/* ---------- режимы упаковки ---------- */

/**
 * node scripts/package-scorm.mjs           — scorm (по умолчанию): курс
 *                                             для импорта в LMS;
 * node scripts/package-scorm.mjs embed     — embed: контент для встраивания
 *                                             в сторонние курсы;
 * node scripts/package-scorm.mjs all       — оба (удобно в CI).
 *
 * Режимы независимы: у каждого свой каталог и свой ZIP, читают один и тот же
 * dist. Отдельная сборка приложения им не нужна — HTML-точки входа
 * (lesson-<id>.html и embed-<id>.html) плагин генерирует при `npm run build`
 * для обоих сразу: это файлы по 200 байт, а отдельный Vite-конвейер ради них
 * только размножал бы точки истины.
 */
const MODES = { scorm: ["scorm"], embed: ["embed"], all: ["scorm", "embed"] };
const mode = process.argv[2] ?? "scorm";
// Object.hasOwn, а не `in`: `in` проверяет и прототип, и «constructor»
// прошёл бы проверку, а дальше упал бы с TypeError вместо этого сообщения.
if (!Object.hasOwn(MODES, mode)) {
  console.error(
    `Ошибка: неизвестный режим "${mode}". Доступны: ${Object.keys(MODES).join(", ")}.`,
  );
  process.exit(1);
}
const targets = MODES[mode];

const lessons = readLessons(CATALOG);
if (lessons.length === 0) {
  console.error("Ошибка: в каталоге нет моделей с 3D — нечего упаковывать.");
  process.exit(1);
}

const missing = lessons
  .filter(
    (lesson) =>
      !existsSync(join(DIST, `lesson-${lesson.id}.html`)) ||
      !existsSync(join(DIST, `embed-${lesson.id}.html`)),
  )
  .map((lesson) => lesson.id);
if (missing.length) {
  console.error(
    `Ошибка: в dist нет HTML-точек входа уроков: ${missing.join(", ")}.\n` +
      "Пересоберите приложение (npm run build).",
  );
  process.exit(1);
}

console.log(`Режим упаковки: ${mode}`);
console.log("Сканирую собранное приложение...");
const files = walk(DIST, DIST);
console.log(`Файлов в dist: ${files.length}, уроков: ${lessons.length}`);

/* ---------- SCORM-пакет ---------- */

if (targets.includes("scorm")) {
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
}

/* ---------- контент-пакет для сторонних курсов ---------- */

/**
 * content-package/ — dist без манифеста, для встраивания в чужой курс.
 * В каждый HTML вшивается window.__CONTENT_EMBED__ — включая
 * embed-<id>.html, у которого есть свой __VIEWER__: страховка на случай,
 * если тот скрипт не выполнится (см. комментарий в цикле ниже). Страница
 * гарантированно работает в режиме embed и никогда не вызывает Initialize
 * на API_1484_11 чужого SCO. Флаг в файле, а не в query-параметре: автор
 * стороннего курса не сможет его забыть, а забытый флаг означал бы
 * нарушение протокола в чужой сессии.
 *
 * Отсюда и строгость: страница без флага — хуже, чем нет пакета вовсе,
 * поэтому молча пропущенная подмена `<head>` обрывает сборку, а не
 * проходит дальше. `String.replace` при отсутствии совпадения возвращает
 * исходную строку, и без этой проверки битый пакет вышел бы с сообщением
 * «страниц: N» и зелёным CI.
 */
const CONTENT_EMBED_TAG = "<script>window.__CONTENT_EMBED__ = true;</script>";

function writeContentPackage() {
  if (existsSync(CONTENT)) rmSync(CONTENT, { recursive: true, force: true });
  mkdirSync(CONTENT, { recursive: true });
  cpSync(DIST, CONTENT, { recursive: true });

  const pages = readdirSync(CONTENT).filter((name) => name.endsWith(".html"));
  const skipped = [];
  let patched = 0;

  for (const name of pages) {
    const pagePath = join(CONTENT, name);
    let html = readFileSync(pagePath, "utf8");

    /*
     * Флаг вшивается в КАЖДУЮ страницу, включая embed-<id>.html с её
     * собственным __VIEWER__. Сегодня это дублирование: embedMode()
     * смотрит __VIEWER__ первым и до __CONTENT_EMBED__ не доходит.
     * Дублирование оставлено намеренно — это страховка на случай, если
     * inline-скрипт с __VIEWER__ не выполнится: без страховки страница
     * ушла бы в createLearningRuntime(), нашла бы API_1484_11 в
     * родителях (findScorm2004Api поднимается на 50 фреймов вверх) и
     * открыла Initialize поверх чужой SCO-сессии. С __CONTENT_EMBED__
     * она в худшем случае откроется как полный урок — тоже вне SCORM.
     *
     * Проверка ниже — защита от повторной вшивки, а не обычный путь:
     * CONTENT каждый раз собирается заново из dist, где флага нет.
     */
    if (!html.includes(CONTENT_EMBED_TAG)) {
      const injected = html.replace(
        /<head>/i,
        `  <head>\n    ${CONTENT_EMBED_TAG}`,
      );
      if (injected === html) {
        skipped.push(name);
        continue;
      }
      html = injected;
      writeFileSync(pagePath, html, "utf8");
    }
    patched += 1;
  }

  if (skipped.length) {
    console.error(
      `Ошибка: не удалось вшить ${CONTENT_EMBED_TAG} в ${skipped.join(", ")}.\n` +
        "Такая страница в чужом курсе нашла бы API_1484_11 в родителях и " +
        "открыла Initialize поверх чужой сессии. Проверьте, что в этих " +
        "HTML есть строка <head> (см. index.html и vite-plugin-lessons.ts).",
    );
    process.exit(1);
  }

  return patched;
}

let contentPages = 0;
if (targets.includes("embed")) {
  console.log("Собираю контент-пакет для сторонних курсов ...");
  contentPages = writeContentPackage();
}

/* ---------- ZIP-архивы ---------- */

/**
 * ZIP только через Python zipfile: PowerShell Compress-Archive и .NET
 * ZipFile пишут записи с обратными слэшами, и LMS на Linux такой пакет
 * не импортирует. Не заменять.
 */
function makeZip(srcDir, outPath) {
  if (existsSync(outPath)) rmSync(outPath, { force: true });
  try {
    execFileSync(
      "python",
      [
        "-c",
        "import zipfile,os,sys; src,out=sys.argv[1],sys.argv[2]; z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f),src).replace(chr(92),'/')) for r,_,fs in os.walk(src) for f in fs]; z.close()",
        srcDir,
        outPath,
      ],
      { cwd: ROOT, stdio: "ignore" },
    );
  } catch {
    /* ниже проверяем existsSync и, если надо, подсказываем вручную */
  }
  return existsSync(outPath);
}

console.log("Создаю ZIP-архивы ...");
if (targets.includes("scorm") && !makeZip(OUT, ZIP)) {
  console.warn("  Не удалось создать ZIP автоматически. Создайте вручную:");
  console.warn(
    "  Compress-Archive -Path scorm-package\\* -DestinationPath configurator-web-scorm2004.zip",
  );
}
if (targets.includes("embed") && !makeZip(CONTENT, CONTENT_ZIP)) {
  console.warn("  Не удалось создать контент-ZIP автоматически. Создайте вручную:");
  console.warn(
    "  Compress-Archive -Path content-package\\* -DestinationPath configurator-content.zip",
  );
}

function sizeMb(path) {
  return (existsSync(path) ? statSync(path).size / 1048576 : 0).toFixed(1);
}

console.log(`Готово (режим ${mode}):`);
if (targets.includes("scorm")) {
  console.log(`  SCORM-пакет (распакованный): ${OUT}`);
  console.log(`  Файлов: ${files.length + 1}`);
  console.log(`  ZIP: ${ZIP} (${sizeMb(ZIP)} MB)`);
}
if (targets.includes("embed")) {
  console.log(`  Контент-пакет (без манифеста): ${CONTENT}, страниц: ${contentPages}`);
  console.log(`  ZIP: ${CONTENT_ZIP} (${sizeMb(CONTENT_ZIP)} MB)`);
}

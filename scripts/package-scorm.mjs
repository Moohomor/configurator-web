#!/usr/bin/env node
/* =====================================================================
 * package-scorm.mjs
 * Собирает SCORM 2004 (4th Edition) пакет из собранного приложения:
 *   example-main/dist  ->  scorm-package/ + configurator-web-scorm2004.zip
 *
 * Генерирует imsmanifest.xml (SCO, все файлы перечислены) и копирует
 * содержимое dist в корень пакета.
 * ===================================================================== */
import { mkdirSync, cpSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "example-main", "dist");
const OUT = join(ROOT, "scorm-package");

const TITLE = "3D-конфигуратор подвижного состава";
const ID = "configurator_web_scorm2004";
const ID_RES = "res-configurator-sco";
const SCHEMA = "adlscorm";
const SCHEMA_VERSION = "2004 4th Edition";

/* ---------- файлы пакета ---------- */

function walk(dir, base, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full).split(sep).join("/");
    if (statSync(full).isDirectory()) {
      walk(full, base, acc);
    } else {
      acc.push(rel);
    }
  }
  return acc;
}

function xmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* ---------- imsmanifest.xml ---------- */

function buildManifest(files) {
  const fileTags = files
    .map((f) => `      <file href="${xmlEscape(f)}"/>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- SCORM 2004 4th Edition Content Package -->
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
          <imsmd:string xml:lang="ru">3D-конфигуратор подвижного состава: каталог моделей локомотивов, вагонов и деталей с возможностью просмотра, настройки текстур, освещения и анимаций.</imsmd:string>
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
      <item identifier="item-sco" identifierref="${ID_RES}">
        <title>${xmlEscape(TITLE)}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="${ID_RES}" type="webcontent" adlcp:scormType="sco" href="index.html">
${fileTags}
    </resource>
  </resources>
</manifest>
`;
}

/* ---------- сборка ---------- */

if (!existsSync(DIST)) {
  console.error(`Ошибка: не найдена папка сборки ${DIST}. Сначала выполните npm run build.`);
  process.exit(1);
}

console.log("Сканирую собранное приложение...");
const files = walk(DIST, DIST);
console.log(`Файлов в пакете: ${files.length}`);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log("Копирую файлы в scorm-package/ ...");
cpSync(DIST, OUT, { recursive: true });

console.log("Генерирую imsmanifest.xml ...");
const manifest = buildManifest(files);
const manifestPath = join(OUT, "imsmanifest.xml");
mkdirSync(dirname(manifestPath), { recursive: true });

import { writeFileSync } from "node:fs";
writeFileSync(manifestPath, manifest, "utf8");

/* ---------- ZIP-архив пакета ---------- */

const ZIP = join(ROOT, "configurator-web-scorm2004.zip");

console.log("Создаю ZIP-архив ...");
import { execFileSync } from "node:child_process";
import { rmSync as rm } from "node:fs";

if (existsSync(ZIP)) rm(ZIP, { force: true });

// Архив с прямыми слэшами (важно для импорта в LMS на Linux).
// Используем Python zipfile (доступен в большинстве окружений);
// при отсутствии python архив создаётся командой PowerShell:
//   Compress-Archive -Path scorm-package\* -DestinationPath configurator-web-scorm2004.zip
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
} catch (e) {
  zipOk = existsSync(ZIP);
}
if (!zipOk) {
  console.warn("  Не удалось создать ZIP автоматически. Используйте:");
  console.warn("  Compress-Archive -Path scorm-package\\* -DestinationPath configurator-web-scorm2004.zip");
}

console.log("Готово:");
console.log(`  Пакет (распакованный): ${OUT}`);
console.log(`  Файлов: ${files.length + 1}`);
console.log(`  imsmanifest.xml: ${manifestPath}`);
console.log(`  ZIP: ${ZIP} (${(existsSync(ZIP) ? statSync(ZIP).size / 1048576 : 0).toFixed(1)} MB)`);
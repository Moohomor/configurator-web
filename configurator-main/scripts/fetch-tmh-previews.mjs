// One-shot downloader for tmholding.ru thumbnails used by placeholder cards in
// the configurator's main screen. Idempotent: skips files that already exist.
// Run: node configurator-main/scripts/fetch-tmh-previews.mjs
import { writeFile, mkdir, stat } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = resolve(
  __dirname,
  "../../example-main/public/tmh-previews"
);
const BASE = "https://tmholding.ru";

const FILES = [
  // Локомотивы — Грузовые
  { url: "/upload/iblock/a4c/byeo5fhw9w5a721dqkgeq5p530tsd004.jpg", filename: "loco-3te28.jpg" },
  { url: "/upload/iblock/b6e/l0hyjwgafdcibpz5zz1fmcjfishjpgxv.jpg", filename: "loco-3te25k2m.jpg" },
  { url: "/upload/iblock/eb7/eb73144b754f0ef53ae5a36331fe7c32.jpg", filename: "loco-2te25km.jpg" },
  { url: "/upload/iblock/5ba/v65g458qdfh7urrgqe735rogpf4vilc4.jpg", filename: "loco-es5k-ermak.jpg" },
  { url: "/upload/iblock/93a/93a07ae59ebc6d20e449a144fa38f105.jpg", filename: "loco-es4k-donchak.jpg" },
  { url: "/upload/iblock/3f4/3f4ca8b2f72ff401a425122ac5e6f8c3.jpg", filename: "loco-es5s.jpg" },
  // Локомотивы — Пассажирские
  { url: "/upload/iblock/21b/21bf1bd67007e37bab5e3995a2687a51.jpg", filename: "loco-tep70bs.jpg" },
  { url: "/upload/iblock/ce5/9s8e2z1glbevjrjmasap3g54h1hi6o6k.jpg", filename: "loco-ep2k.jpg" },
  { url: "/upload/iblock/4b0/4b0ef360ae4e009123f1828cfdfe52ba.jpg", filename: "loco-ep1mp.jpg" },
  { url: "/upload/iblock/207/20733c5a9fbaec859b2c987dff3cb24c.jpg", filename: "loco-ep20.jpg" },
  // Локомотивы — Промышленные/маневровые
  { url: "/upload/iblock/7af/0y9qoy53vhfd1adt3b3alayq7g5uoeca.jpg", filename: "loco-tem23.jpg" },
  { url: "/upload/iblock/824/k3p78sk32qsgrisiku3lp0mkjaq4uqiu.jpg", filename: "loco-emka2.jpg" },
  { url: "/upload/iblock/c1b/hg7tpl0soimgs3vr1z4hzc2umfci3li5.jpg", filename: "loco-tem18dm.jpg" },
  { url: "/upload/iblock/46f/12y0sk3cbz11zmnveh3huk46v0k1mdvk.jpg", filename: "loco-tem28.jpg" },
  { url: "/upload/iblock/868/6mrweelktpilriry84m7ioy3xb83ohg6.jpg", filename: "loco-npm2m.jpg" },
  { url: "/upload/iblock/f4c/ijvem6h56mkblky4fbs2ol03p2xxvb4v.jpg", filename: "loco-np1.jpg" },
  // Вагоны метро — Ключевые проекты
  { url: "/upload/iblock/924/enh2qqeqyfznlnwtc2uockown88cphnz.jpg", filename: "metro-moscow-2024.jpg" },
  { url: "/upload/iblock/b71/b711b028de1380aee0d31f88a5389be7.jpg", filename: "metro-moscow-2020.jpg" },
  { url: "/upload/iblock/67c/67ce790583a182a03d61ccc25f30a0f7.jpg", filename: "metro-moscow-765.jpg" },
  { url: "/upload/iblock/c15/fojgyvwvzul7f4aymtc5cslmtpt055gh.jpg", filename: "metro-baltiyets.jpg" },
  // Вагоны метро — Экспорт
  { url: "/upload/iblock/635/u4hlpqo0oodqf5i7xnmpnd68pbp3y2x5.jpg", filename: "metro-minsk-2024.jpg" },
  { url: "/upload/iblock/e6d/e6d2e66bd517edb21e84f73cdab9a4e5.jpg", filename: "metro-budapest.jpg" },
  { url: "/upload/iblock/b8c/b8c4373f711e0f71806eaeca22966650.jpg", filename: "metro-sofia.jpg" },
  { url: "/upload/iblock/15c/wk7kye79uz4jtndo32caunqj2ynp4t2k.jpg", filename: "metro-tashkent.jpg" },
  { url: "/upload/iblock/81b/nf14ljlrn7pjf042f56lddaihzjp1p23.jpg", filename: "metro-baku.jpg" },
  // Вагоны метро — Спецпроекты
  { url: "/upload/iblock/448/448a496fbf632feadedebbfa5f95799b.jpg", filename: "metro-akvarel.jpg" },
  { url: "/upload/iblock/373/373a8d4e02df7cb781010f2aa8291eab.jpg", filename: "metro-krasnaya-strela.jpg" },
  { url: "/upload/iblock/e07/e0719646310aeb8b8ba8e2e2657fe30f.jpg", filename: "metro-retropoezd.jpg" },
  // Электропоезда и дизель-поезда — Электропоезда
  { url: "/upload/iblock/e61/h7astywutq8nkw5ztmj0rlv7t66vk7ho.jpg", filename: "train-ivolga-4.jpg" },
  { url: "/upload/iblock/dcb/ikcuw200vslrlerfog2a2gxwus6fpnhb.jpg", filename: "train-ivolga-3.jpg" },
  { url: "/upload/iblock/9b5/d1ymt0qeicyof5av7b76ke17cdnzsx89.jpg", filename: "train-ep2dm.jpg" },
  { url: "/upload/iblock/767/76729bb7fed2ba15e5608b1b8ee9011c.jpg", filename: "train-ep2d-ep3d.jpg" },
  // Электропоезда и дизель-поезда — Дизель-поезда
  { url: "/upload/iblock/97c/97c4a34ecddf3082b57bfab2bd12e4e2.jpeg", filename: "train-orlan.jpeg" },
  // Пассажирские вагоны — Одноэтажные
  { url: "/upload/iblock/46b/46b989854764f5ec1c4bd0d501c0e12e.jpg", filename: "passwagon-61-4517.jpg" },
  { url: "/upload/iblock/cbd/cbd241a4d2962965240fd829816210c9.jpg", filename: "passwagon-61-4516.jpg" },
  { url: "/upload/iblock/68b/68b74f53236c53af92c94b577e4d492e.jpg", filename: "passwagon-61-4529.jpg" },
  { url: "/upload/iblock/f89/f894f25e6a16532f5942c9fe75d0fa02.jpg", filename: "passwagon-61-4458.jpg" },
  { url: "/upload/iblock/da0/da087d9c4f241b2d461163d04bd0b748.jpg", filename: "passwagon-61-4460.jpg" },
  { url: "/upload/iblock/af5/af59be1007c066229a47160af6af7e62.jpg", filename: "passwagon-61-4440.jpg" },
  { url: "/upload/iblock/ad5/ad51d740d4ecaea32ac103029543e047.jpg", filename: "passwagon-61-4445.jpg" },
  { url: "/upload/iblock/396/396a87709f9e3b3354ea800e701a9cd9.jpg", filename: "passwagon-61-4447.jpg" },
  // Пассажирские вагоны — Двухэтажные
  { url: "/upload/iblock/714/ymh06emetk24pzz8dm0kx9iiidxv50u0.jpg", filename: "passwagon-61-4523.jpg" },
  { url: "/upload/iblock/7d2/o8irx0ux4x3htrm9l82undtzk4ekch2x.jpg", filename: "passwagon-61-4524.jpg" },
  { url: "/upload/iblock/282/4e0zo7bjyrc658qomgyd08fuktum8x3z.jpg", filename: "passwagon-61-4525.jpg" },
  { url: "/upload/iblock/4bd/jpbvi73f0j9yql25chqqm0jkd35ahsvo.jpg", filename: "passwagon-61-4492.jpg" },
  { url: "/upload/iblock/e9c/e9c25828f0d126892cba23d3a6d43a95.jpg", filename: "passwagon-61-4503.jpg" },
  { url: "/upload/iblock/571/5711c375fa11bbc955d6d6391867c056.jpg", filename: "passwagon-61-4472.jpg" },
  { url: "/upload/iblock/66f/66fda0f96070a909d17817aab54d6762.jpg", filename: "passwagon-61-4473.jpg" },
  { url: "/upload/iblock/633/6335cc4f9ad9983280575e09eb938b12.jpg", filename: "passwagon-61-4465.jpg" },
  // Специальные вагоны
  { url: "/upload/iblock/bed/bedaf298d0356d50e38233add33f9461.jpg", filename: "special-baggage.jpg" },
  { url: "/upload/iblock/791/791b38bcf2b2429febd09a1f9e9e6338.jpg", filename: "special-escort.jpg" },
  { url: "/upload/iblock/8e8/5u5i02ng06oqyvdn91tqooflq0o27xyu.jpg", filename: "special-power-station.jpg" },
];

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  await mkdir(TARGET_DIR, { recursive: true });
  let downloaded = 0, skipped = 0, failed = 0;
  for (const { url, filename } of FILES) {
    const out = join(TARGET_DIR, filename);
    if (await exists(out)) {
      skipped++;
      continue;
    }
    try {
      const res = await fetch(BASE + url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(out, buf);
      downloaded++;
      console.log(`downloaded ${filename}`);
    } catch (e) {
      console.error(`failed ${filename}: ${e.message}`);
      failed++;
    }
  }
  console.log(`done: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  if (failed) process.exit(1);
}

main();

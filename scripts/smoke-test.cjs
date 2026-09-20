#!/usr/bin/env node
/* =====================================================================
 * smoke-test.cjs
 * Функциональный тест SCORM-обёртки (scorm2004.js) и трекера курса
 * (course.js) в среде jsdom.
 *
 * Приложение монтируется библиотекой во iframe (#app iframe) — тест
 * размещает DOM конфигуратора внутри contentDocument iframe и шлёт
 * события оттуда, проверяя, что трекер их ловит.
 * ===================================================================== */
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const DIST = path.join(__dirname, "..", "example-main", "dist", "scorm");

function load(name) {
  return fs.readFileSync(path.join(DIST, name), "utf8");
}

const SCORM_SRC = load("scorm2004.js");
const COURSE_SRC = load("course.js");

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log("  ok   " + name);
  } else {
    failed++;
    console.error("  FAIL " + name + (extra ? " — " + extra : ""));
  }
}

function makeLms() {
  const data = {};
  const calls = [];
  return {
    data,
    calls,
    api: {
      Initialize: (p) => { calls.push("Initialize(" + p + ")"); return "true"; },
      Terminate: (p) => { calls.push("Terminate(" + p + ")"); return "true"; },
      Commit: (p) => { calls.push("Commit(" + p + ")"); return "true"; },
      GetValue: (n) => data[n] || "",
      SetValue: (n, v) => { data[n] = String(v); calls.push(n + "=" + v); return "true"; },
      GetLastError: () => "0",
      GetErrorString: () => "No error",
      GetDiagnostic: () => "No diagnostic",
    },
  };
}

/** Структура приложения как в реальности: DOM конфигуратора — внутри
 *  iframe, вставленного в #app родительской страницы. */
async function makeHarness(lms) {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body><div id='app'></div></body></html>",
    { url: "http://course.local/index.html", runScripts: "outside-only" },
  );
  const win = dom.window;
  if (lms) win.API_1484_11 = lms.api;
  win.eval(SCORM_SRC);
  win.eval(COURSE_SRC);

  // iframe приложения
  const appEl = win.document.getElementById("app");
  const iframe = win.document.createElement("iframe");
  iframe.setAttribute("id", "app-iframe");
  iframe.setAttribute("srcdoc", "<!doctype html><html><body></body></html>");
  appEl.appendChild(iframe);
  const idoc = await new Promise((resolve) => {
    if (iframe.contentDocument) return resolve(iframe.contentDocument);
    iframe.addEventListener("load", () => resolve(iframe.contentDocument));
  });

  // дать трекеру время привязать обработчики
  await new Promise((r) => setTimeout(r, 450));

  return { dom, win, idoc };
}

function buildAppDom(doc) {
  const makeCard = (name) => {
    const card = doc.createElement("div");
    card.className = "card";
    const nameEl = doc.createElement("div");
    nameEl.className = "card-name";
    nameEl.textContent = name;
    card.appendChild(nameEl);
    return card;
  };

  const host = doc.createElement("div");
  host.id = "__app";

  const selector = doc.createElement("div");
  selector.className = "configurator-model-selector";
  const cardEp20 = makeCard("ЭП20");
  const cardMsk = makeCard("Москва-2020");
  const cardOther = makeCard("ТЭМ23");
  selector.appendChild(cardEp20);
  selector.appendChild(cardMsk);
  selector.appendChild(cardOther);

  const sidebar = doc.createElement("div");
  sidebar.className = "configurator-sidebar";
  const playBtn = doc.createElement("button");
  playBtn.className = "play-pause-btn";
  sidebar.appendChild(playBtn);

  host.appendChild(selector);
  host.appendChild(sidebar);
  doc.body.appendChild(host);
  return { cardEp20, cardMsk, cardOther, playBtn };
}

function fire(el, type, win, opts) {
  const o = opts || {};
  const ev = new win.Event(type, { bubbles: true, cancelable: true });
  if (type === "keydown") ev.key = o.key || "Enter";
  el.dispatchEvent(ev);
}

(async () => {
  console.log("\n=== Тест 1: без LMS (курс открыт сам по себе) ===");
  {
    const { win } = await makeHarness(null);
    check("SCORM.isAvailable() === false", win.SCORM.isAvailable() === false);
    check(
      "виджет показывает 'вне LMS'",
      win.document.querySelector(".cw-note") &&
        win.document.querySelector(".cw-note").textContent.indexOf("вне LMS") !== -1,
    );
    check("завершение без LMS безопасно (handled=true)", win.courseTracker.finish() === true);
  }

  console.log("\n=== Тест 2: с LMS — обе модели открыты (события из iframe) ===");
  let lms;
  {
    const h = await makeHarness((lms = makeLms()));
    const { win, idoc } = h;
    const els = buildAppDom(idoc);

    check("API найден и сессия инициализирована", win.SCORM.isInitialized() === true);

    fire(els.cardEp20, "click", idoc.defaultView);
    fire(els.cardMsk, "click", idoc.defaultView);
    // клик по «чужой» модели не должен ничего засчитать
    fire(els.cardOther, "click", idoc.defaultView);

    const st = win.courseTracker.getState();
    check("ЭП20 отмечен", !!st.done.open_ep20, JSON.stringify(st.done));
    check("Москва-2020 отмечен", !!st.done.open_moscow2020, JSON.stringify(st.done));
    check("ТЭМ23 не засчитан (нет такого задания)", Object.keys(st.done).length === 2, JSON.stringify(st.done));
    check("анимация не выполнена", !st.done.animation_played);
    check("оценка 67%", st.score === 67, "score=" + st.score);
    check("core completed", st.completed === true);

    win.courseTracker.finish();
    const d = lms.data;
    check("cmi.score.raw = 67", d["cmi.score.raw"] === "67", d["cmi.score.raw"]);
    check("cmi.completion_status = completed", d["cmi.completion_status"] === "completed");
    check("cmi.success_status = passed", d["cmi.success_status"] === "passed");
    check("cmi.exit = normal", d["cmi.exit"] === "normal");
    check("interactions._count = 3", d["cmi.interactions._count"] === "3");
    check("open_ep20 result = correct", d["cmi.interactions.0.result"] === "correct");
    check("animation result = incorrect", d["cmi.interactions.2.result"] === "incorrect");
    check("Terminate вызван", lms.calls.some((c) => c.indexOf("Terminate") === 0));
    const countBefore = lms.calls.length;
    win.courseTracker.finish();
    check("повторный finish игнорируется", lms.calls.length === countBefore);
  }

  console.log("\n=== Тест 3: обе модели + анимация -> 100%, passed ===");
  {
    const h = await makeHarness((lms = makeLms()));
    const { win, idoc } = h;
    const els = buildAppDom(idoc);
    fire(els.cardEp20, "click", idoc.defaultView);
    fire(els.cardMsk, "click", idoc.defaultView);
    fire(els.playBtn, "click", idoc.defaultView);
    fire(els.playBtn, "click", idoc.defaultView); // повтор — не должен удвоить
    const st = win.courseTracker.getState();
    check("все 3 отмечены", Object.keys(st.done).length === 3, JSON.stringify(st.done));
    check("оценка 100%", st.score === 100, st.score);
    win.courseTracker.finish();
    const d = lms.data;
    check("score.raw = 100", d["cmi.score.raw"] === "100");
    check("success = passed", d["cmi.success_status"] === "passed");
    check("все интеракции correct", [0, 1, 2].every((i) => d["cmi.interactions." + i + ".result"] === "correct"));
  }

  console.log("\n=== Тест 4: только одна модель -> incomplete, failed ===");
  {
    const h = await makeHarness((lms = makeLms()));
    const { win, idoc } = h;
    const els = buildAppDom(idoc);
    fire(els.cardEp20, "click", idoc.defaultView);
    win.courseTracker.finish();
    const d = lms.data;
    check("completion = incomplete", d["cmi.completion_status"] === "incomplete");
    check("exit = suspend", d["cmi.exit"] === "suspend");
    check("success = failed", d["cmi.success_status"] === "failed");
    check("score = 33%", d["cmi.score.raw"] === "33", d["cmi.score.raw"]);
  }

  console.log("\n=== Тест 5: клавиатурная активация карточек (Enter) ===");
  {
    const h = await makeHarness(null);
    const { win, idoc } = h;
    const els = buildAppDom(idoc);
    fire(els.cardEp20, "keydown", idoc.defaultView, { key: "Enter" });
    fire(els.cardMsk, "keydown", idoc.defaultView, { key: " " });
    const st = win.courseTracker.getState();
    check("Enter открывает ЭП20", !!st.done.open_ep20);
    check("Space открывает Москва-2020", !!st.done.open_moscow2020);
  }

  console.log("\n=== Тест 6: 'аварийный' flush обёртки (course.js не успел) ===");
  {
    const h = await makeHarness((lms = makeLms()));
    const { win } = h;
    const flushed = win.SCORM.flush();
    check("flush успешен", flushed === true);
    check("exit = suspend при аварии", lms.data["cmi.exit"] === "suspend");
    check("session_time установлен при аварии", !!lms.data["cmi.session_time"]);
    check("terminate вызван", lms.calls.some((c) => c.indexOf("Terminate") === 0));
  }

  console.log("\n----------------------------------------");
  console.log("Пройдено: " + passed + ", Ошибок: " + failed);
  process.exit(failed === 0 ? 0 : 1);
})();
#!/usr/bin/env node
/* =====================================================================
 * smoke-test.cjs
 * Функциональный тест SCORM-обёртки (scorm2004.js) и трекера курса
 * (course.js) в среде jsdom: поиск API_1484_11, детекция интеракций
 * по реальным DOM-событиям, подсчёт оценки и полный отчёт в имитацию LMS.
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

/** Строит минимальные элементы приложения, на которые опирается трекер. */
function buildAppDom(doc) {
  const mk = (sel, cls) => {
    const el = doc.createElement("div");
    el.className = cls;
    if (sel === ".configurator-model-selector .card:not(.card--unavailable)") {
      el.classList.add("card");
    } else if (sel && sel.includes("part-item")) {
      el.classList.add("part-item");
    } else if (sel && sel.includes("part-info")) {
      el.classList.add("part-info");
    } else {
      const last = sel ? sel.split(" ").pop().split(".")[1] : null;
      if (last && !["card"].includes(last)) el.classList.add(last);
    }
    return el;
  };

  const host = doc.createElement("div");
  host.id = "__app";

  // Экран выбора модели
  const selector = mk(null, "configurator-model-selector");
  const modelCard = mk(null, "card");
  selector.appendChild(modelCard);

  // Конфигуратор
  const sidebar = mk(null, "configurator-sidebar");
  const partInfo = mk(null, "part-info");
  const partItem = mk(null, "part-item");
  const toggleBtn = mk(null, "base-button button-danger");
  partItem.appendChild(toggleBtn);
  sidebar.appendChild(partInfo);
  sidebar.appendChild(partItem);
  const item = mk(null, "texture-pack-item");
  sidebar.appendChild(item);
  const preset = mk(null, "light-preset-btn");
  sidebar.appendChild(preset);
  const pad = mk(null, "light-pad");
  sidebar.appendChild(pad);
  const slider = doc.createElement("input");
  slider.className = "light-height-slider";
  sidebar.appendChild(slider);

  const viewer = mk(null, "viewer-wrapper");
  const canvas = doc.createElement("canvas");
  viewer.appendChild(canvas);

  const infoTab = mk(null, "info-panel-tab");

  host.appendChild(selector);
  host.appendChild(sidebar);
  host.appendChild(viewer);
  host.appendChild(infoTab);
  doc.body.appendChild(host);
  return { modelCard, partInfo, toggleBtn, item, preset, pad, slider, canvas, infoTab, selector };
}

function fire(el, type, win, opts) {
  const o = opts || {};
  const ev = new win.Event(type, { bubbles: true, cancelable: true });
  if (type === "keydown") {
    ev.key = o.key || "Enter";
  }
  el.dispatchEvent(ev);
}

(async () => {
  console.log("\n=== Тест 1: без LMS (курс открыт сам по себе) ===");
  {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://course.local/index.html",
      runScripts: "outside-only",
    });
    const win = dom.window;
    win.eval(SCORM_SRC);
    win.eval(COURSE_SRC);
    await new Promise((r) => setTimeout(r, 300));

    check("SCORM.isAvailable() === false", win.SCORM.isAvailable() === false);
    check(
      "виджет показывает 'вне LMS'",
      !win.SCORM.isAvailable() ||
        (dom.window.document.querySelector(".cw-note") &&
          dom.window.document.querySelector(".cw-note").textContent.indexOf("вне LMS") !== -1),
    );
    check("завершение без LMS безопасно (handled=true)", win.courseTracker.finish() === true);
  }

  console.log("\n=== Тест 2: с LMS — все 5 обязательных заданий ===");
  let lms;
  {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://course.local/index.html",
      runScripts: "outside-only",
    });
    const win = dom.window;
    lms = makeLms();
    win.API_1484_11 = lms.api;

    win.eval(SCORM_SRC);
    win.eval(COURSE_SRC);
    await new Promise((r) => setTimeout(r, 300));

    check("API найден и сессия инициализирована", win.SCORM.isInitialized() === true);
    check("Initialize вызван", lms.calls.some((c) => c.indexOf("Initialize") === 0));

    const els = buildAppDom(dom.window.document);

    // model_selected — клик по доступной карточке модели
    fire(els.modelCard, "click", win);
    // viewer_interacted — pointerdown на canvas
    fire(els.canvas, "pointerdown", win);
    // part_explored — клик по part-info
    fire(els.partInfo, "click", win);
    // info_opened — клик по кнопке панели информации
    fire(els.infoTab, "click", win);
    // light_adjusted — клик по пресету освещения
    fire(els.preset, "click", win);

    const st = win.courseTracker.getState();
    check("отмечены все 5 обязательных заданий", st.done.model_selected && st.done.viewer_interacted && st.done.part_explored && st.done.info_opened && st.done.light_adjusted, JSON.stringify(st.done));
    check("бонусные задания ещё не выполнены", !st.done.texture_applied && !st.done.animation_played);
    check("оценка 71%", st.score === 71, "score=" + st.score);
    check("core completed", st.completed === true);

    // Финализация
    win.courseTracker.finish();
    check("reported === true", win.courseTracker.getState().reported === true);

    const d = lms.data;
    check("cmi.score.raw = 71", d["cmi.score.raw"] === "71", d["cmi.score.raw"]);
    check("cmi.score.min = 0", d["cmi.score.min"] === "0");
    check("cmi.score.max = 100", d["cmi.score.max"] === "100");
    check("cmi.completion_status = completed", d["cmi.completion_status"] === "completed", d["cmi.completion_status"]);
    check("cmi.success_status = passed", d["cmi.success_status"] === "passed", d["cmi.success_status"]);
    check("cmi.exit = normal", d["cmi.exit"] === "normal", d["cmi.exit"]);
    check("session_time установлен", /^\d{2}:\d{2}:\d{2}$/.test(d["cmi.session_time"] || ""), d["cmi.session_time"]);
    check("interactions._count = 7", d["cmi.interactions._count"] === "7", d["cmi.interactions._count"]);

    const doneIds = ["cmi.interactions.0.result", "cmi.interactions.1.result", "cmi.interactions.2.result", "cmi.interactions.3.result", "cmi.interactions.4.result"];
    const bonusIds = ["cmi.interactions.5.result", "cmi.interactions.6.result"];
    check(
      "первые 5 интеракций = correct",
      doneIds.every((k) => d[k] === "correct"),
      JSON.stringify(doneIds.map((k) => d[k])),
    );
    check(
      "бонусные интеракции = incorrect",
      bonusIds.every((k) => d[k] === "incorrect"),
      JSON.stringify(bonusIds.map((k) => d[k])),
    );
    check("Terminate вызван", lms.calls.some((c) => c.indexOf("Terminate") === 0));

    // Повторный finish ничего не меняет
    const countBefore = lms.calls.length;
    win.courseTracker.finish();
    check("повторный finish игнорируется", lms.calls.length === countBefore);
  }

  console.log("\n=== Тест 3: все 7 заданий -> 100%, completed, passed ===");
  {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://course.local/index.html",
      runScripts: "outside-only",
    });
    const win = dom.window;
    lms = makeLms();
    win.API_1484_11 = lms.api;
    win.eval(SCORM_SRC);
    win.eval(COURSE_SRC);
    await new Promise((r) => setTimeout(r, 300));
    const els = buildAppDom(dom.window.document);

    fire(els.modelCard, "click", win);
    fire(els.canvas, "pointerdown", win);
    fire(els.partInfo, "click", win);
    fire(els.infoTab, "click", win);
    fire(els.preset, "click", win);
    // бонусы
    fire(els.item, "click", win); // texture_pack
    fire(els.canvas.parentElement, "click", win); // no-op
    // play-pause-btn
    const playBtn = dom.window.document.createElement("button");
    playBtn.className = "play-pause-btn";
    dom.window.document.body.appendChild(playBtn);
    fire(playBtn, "click", win); // animation_played

    const st = win.courseTracker.getState();
    check("все 7 отмечены", Object.keys(st.done).length === 7, JSON.stringify(st.done));
    check("оценка 100%", st.score === 100, st.score);
    win.courseTracker.finish();
    const d = lms.data;
    check("score.raw = 100", d["cmi.score.raw"] === "100");
    check("success = passed", d["cmi.success_status"] === "passed");
    check("все интеракции correct", Array.from({ length: 7 }, (_, i) => "cmi.interactions." + i + ".result").every((k) => d[k] === "correct"));
  }

  console.log("\n=== Тест 4: незавершённый курс (только 2 задания) ===");
  {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://course.local/index.html",
      runScripts: "outside-only",
    });
    const win = dom.window;
    lms = makeLms();
    win.API_1484_11 = lms.api;
    win.eval(SCORM_SRC);
    win.eval(COURSE_SRC);
    await new Promise((r) => setTimeout(r, 300));
    const els = buildAppDom(dom.window.document);
    fire(els.modelCard, "click", win);
    fire(els.canvas, "pointerdown", win);
    win.courseTracker.finish();
    const d = lms.data;
    check("completion = incomplete", d["cmi.completion_status"] === "incomplete", d["cmi.completion_status"]);
    check("exit = suspend", d["cmi.exit"] === "suspend", d["cmi.exit"]);
    check("success = failed", d["cmi.success_status"] === "failed", d["cmi.success_status"]);
    check("score = 29%", d["cmi.score.raw"] === "29", d["cmi.score.raw"]);
  }

  console.log("\n=== Тест 5: 'аварийный' flush обёртки (course.js не успел) ===");
  {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://course.local/index.html",
      runScripts: "outside-only",
    });
    const win = dom.window;
    lms = makeLms();
    win.API_1484_11 = lms.api;
    win.eval(SCORM_SRC);
    await new Promise((r) => setTimeout(r, 100));
    check("инициализировано", win.SCORM.isInitialized() === true);
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
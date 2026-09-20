/* =====================================================================
 * course.js
 * Трекер интеракций курса «3D-конфигуратор подвижного состава».
 *
 * Задания:
 *   1) open_ep20        — открыть модель ЭП20                    (обяз.)
 *   2) open_moscow2020  — открыть модель «Москва-2020»           (обяз.)
 *   3) animation_played — воспроизвести анимацию (засчитывается
 *                         один раз)                              (бонус)
 *
 * Оценка = выполненных заданий / 3 * 100.
 * completed  — когда открыты обе обязательные модели;
 * success    — passed при оценке >= 67 % (т.е. обе модели открыты).
 *
 * ВАЖНО: приложение монтируется библиотекой в iframe (#app iframe),
 * поэтому трекер слушает события не только в документе страницы, но и
 * в contentDocument iframe (оба документа same-origin).
 * ===================================================================== */
(function (global) {
  "use strict";

  var SCORM = global.SCORM;
  var reported = false;

  var TASKS = [
    { id: "open_ep20", core: true, title: "Открыть модель ЭП20" },
    { id: "open_moscow2020", core: true, title: "Открыть модель «Москва-2020»" },
    { id: "animation_played", core: false, title: "Воспроизвести анимацию" },
  ];

  var CORE_COUNT = TASKS.filter(function (t) { return t.core; }).length;
  var PASS_PERCENT = Math.round((CORE_COUNT / TASKS.length) * 100); // 67

  var done = {}; // id -> ISO timestamp

  /* ---- подсчёт ---------------------------------------------------- */

  function countCore() {
    return TASKS.filter(function (t) { return t.core && done[t.id]; }).length;
  }

  function countDone() {
    return TASKS.filter(function (t) { return done[t.id]; }).length;
  }

  function coreComplete() {
    return countCore() >= CORE_COUNT;
  }

  function scorePercent() {
    return Math.round((countDone() / TASKS.length) * 100);
  }

  function labelFor(id) {
    for (var i = 0; i < TASKS.length; i++) {
      if (TASKS[i].id === id) return TASKS[i].title;
    }
    return id;
  }

  function markTask(id, via) {
    if (reported || done[id]) return;
    done[id] = new Date().toISOString();
    SCORM.addInteraction(id, "other", labelFor(id), "correct", via);
    render();
    if (coreComplete()) {
      showToast("Все обязательные задания выполнены!");
    }
  }

  /* ---- определение задания по карточке модели -------------------- */

  function modelTaskFromCard(card) {
    var nameEl = card.querySelector(".card-name");
    var text =
      (nameEl && (nameEl.textContent || "")) ||
      card.getAttribute("aria-label") ||
      card.getAttribute("title") ||
      "";
    if (text.indexOf("ЭП20") !== -1 || text.indexOf("EP20") !== -1) {
      return "open_ep20";
    }
    if (text.indexOf("Москва-2020") !== -1) {
      return "open_moscow2020";
    }
    return null;
  }

  /* ---- финализация ------------------------------------------------ */

  function finish() {
    if (reported) return false;
    reported = true;

    var percent = scorePercent();
    var completed = coreComplete();
    var success = percent >= PASS_PERCENT ? "passed" : (percent > 0 ? "failed" : "unknown");

    var interactions = TASKS.map(function (t) {
      return {
        id: t.id,
        type: "other",
        description: t.title,
        result: done[t.id] ? "correct" : "incorrect",
        timestamp: done[t.id] || new Date().toISOString(),
      };
    });

    var lmsOk = false;
    if (SCORM && SCORM.isAvailable() && SCORM.isInitialized()) {
      lmsOk = SCORM.report({
        score: percent,
        min: 0,
        max: 100,
        completionStatus: completed ? "completed" : "incomplete",
        successStatus: success,
        exit: completed ? "normal" : "suspend",
        interactions: interactions,
      });
    }

    renderFinished(percent, completed, success, lmsOk);
    return true;
  }

  /* ---- UI ---------------------------------------------------------- */

  var ROOT = null;
  var els = {};

  var ICONS = {
    ok: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1e9e3f" stroke-width="3"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg>',
    no: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#b0b5bd" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
  };

  function buildUI() {
    var style = document.createElement("style");
    style.textContent = [
      "#course-widget{position:fixed;top:14px;right:14px;z-index:100000;width:286px;max-height:calc(100vh - 28px);overflow:auto;background:#fff;border:1px solid #e2e6ea;border-radius:14px;box-shadow:0 8px 28px rgba(15,35,60,.18);font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#22303e;user-select:none}",
      "#course-widget *{box-sizing:border-box}",
      "#course-widget.cw-collapsed{width:auto;overflow:visible}",
      ".cw-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #eef1f4;background:linear-gradient(90deg,#00a4cf,#0089b8);color:#fff;border-radius:13px 13px 0 0}",
      ".cw-title{font-weight:700;font-size:13px;letter-spacing:.02em;white-space:nowrap}",
      ".cw-toggle{border:none;background:rgba(255,255,255,.22);color:#fff;border-radius:6px;width:24px;height:24px;font-size:14px;cursor:pointer;line-height:1}",
      ".cw-toggle:hover{background:rgba(255,255,255,.35)}",
      "#course-widget.cw-collapsed .cw-body{display:none}",
      "#course-widget.cw-collapsed .cw-header{border-radius:13px}",
      ".cw-body{padding:12px}",
      ".cw-score-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}",
      ".cw-score-label{font-size:12px;color:#5b6b7b}",
      ".cw-score{font-weight:800;font-size:18px;color:#00364a}",
      ".cw-bar{height:8px;background:#e9eef2;border-radius:99px;overflow:hidden;margin-bottom:12px}",
      ".cw-fill{height:100%;width:0%;background:linear-gradient(90deg,#00c853,#00a4cf);border-radius:99px;transition:width .35s ease}",
      ".cw-tasks{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:5px}",
      ".cw-task{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:8px;background:#f7f9fb}",
      ".cw-task .cw-txt{flex:1;color:#3a4a58}",
      ".cw-task.cw-done .cw-txt{color:#1e9e3f;text-decoration:none;font-weight:600}",
      ".cw-task.cw-bonus{opacity:.85}",
      ".cw-flag{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#9aa7b3;font-weight:700}",
      ".cw-finish{width:100%;padding:9px 12px;border:none;border-radius:9px;background:#00a4cf;color:#fff;font-weight:700;cursor:pointer;font-size:13px}",
      ".cw-finish:hover{background:#0089b8}",
      ".cw-finish:disabled{background:#c3d0d8;cursor:not-allowed}",
      ".cw-finish.cw-started{background:#1e9e3f}",
      ".cw-note{margin-top:8px;font-size:11px;color:#7c8b99;text-align:center}",
      ".cw-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#00364a;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:100001;opacity:0;transition:opacity .3s ease;pointer-events:none;max-width:86vw;text-align:center}",
      "",
    ].join("\n");
    document.head.appendChild(style);

    ROOT = document.createElement("div");
    ROOT.id = "course-widget";
    ROOT.setAttribute("title", "Статус заданий курса (обновляется при действиях в конфигураторе)");
    ROOT.innerHTML =
      '<div class="cw-header">' +
      '<span class="cw-title">Задания курса</span>' +
      '<button class="cw-toggle" title="Свернуть" aria-expanded="true" aria-label="Свернуть панель заданий">−</button>' +
      "</div>" +
      '<div class="cw-body">' +
      '<div class="cw-score-row"><span class="cw-score-label">Оценка</span><span class="cw-score">0%</span></div>' +
      '<div class="cw-bar"><div class="cw-fill"></div></div>' +
      '<ul class="cw-tasks">' +
      TASKS.map(function (t) {
        return (
          '<li class="cw-task' +
          (t.core ? "" : " cw-bonus") +
          '" data-task="' + t.id + '">' +
          '<span class="cw-ic">' + ICONS.no + "</span>" +
          '<span class="cw-txt">' + t.title + "</span>" +
          (t.core ? "" : '<span class="cw-flag">бонус</span>') +
          "</li>"
        );
      }).join("") +
      "</ul>" +
      '<button class="cw-finish">Завершить курс</button>' +
      '<div class="cw-note"></div>' +
      "</div>";

    document.body.appendChild(ROOT);

    els.toggle = ROOT.querySelector(".cw-toggle");
    els.tasks = ROOT.querySelectorAll(".cw-task");
    els.score = ROOT.querySelector(".cw-score");
    els.fill = ROOT.querySelector(".cw-fill");
    els.finish = ROOT.querySelector(".cw-finish");
    els.note = ROOT.querySelector(".cw-note");

    els.toggle.addEventListener("click", function () {
      var collapsed = ROOT.classList.toggle("cw-collapsed");
      els.toggle.setAttribute("aria-expanded", String(!collapsed));
      els.toggle.setAttribute("title", collapsed ? "Развернуть" : "Свернуть");
      els.toggle.textContent = collapsed ? "+" : "−";
    });

    els.finish.addEventListener("click", function () {
      finish();
    });

    var inLms = SCORM && SCORM.isAvailable() && SCORM.isInitialized();
    els.note.textContent = inLms
      ? "Результат автоматически передаётся в систему обучения"
      : "Конфигуратор запущен вне LMS — результат не сохраняется";
  }

  function render() {
    if (!els.score) return;
    var percent = scorePercent();
    els.score.textContent = percent + "%";
    els.fill.style.width = percent + "%";
    for (var i = 0; i < els.tasks.length; i++) {
      var li = els.tasks[i];
      var id = li.getAttribute("data-task");
      li.classList.toggle("cw-done", !!done[id]);
      li.querySelector(".cw-ic").innerHTML = done[id] ? ICONS.ok : ICONS.no;
    }
  }

  function renderFinished(percent, completed, success, lmsOk) {
    if (!els.finish) return;
    els.finish.textContent = "Результат отправлен";
    els.finish.disabled = true;
    els.finish.classList.add("cw-started");
    els.score.textContent = percent + "% (" + success + ")";
    var note = completed
      ? "Курс завершён. Оценка " + percent + "%"
      : "Не все обязательные задания выполнены. Оценка " + percent + "%";
    if (!lmsOk) note += " — LMS недоступен, результат не сохранён.";
    els.note.textContent = note;
    render();
  }

  var toastTimer = null;
  function showToast(text) {
    var toast = document.querySelector(".cw-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cw-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = "1";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.style.opacity = "0";
    }, 2600);
  }

  /* ---- обработчики (вешаются и на страницу, и на iframe) ----------- */

  function matchTask(target, selectorMap) {
    if (!target || !target.closest) return null;
    for (var id in selectorMap) {
      if (selectorMap.hasOwnProperty(id)) {
        try {
          if (target.closest(selectorMap[id])) return id;
        } catch (e) {
          /* ignore */
        }
      }
    }
    return null;
  }

  var CLICK_TASKS = {
    animation_played: ".play-pause-btn",
  };

  function handleActivate(target, via) {
    if (reported || !target) return null;
    var id = matchTask(target, CLICK_TASKS);
    if (!id) {
      var card = null;
      try {
        card = target.closest
          ? target.closest(".configurator-model-selector .card:not(.card--unavailable)")
          : null;
      } catch (e) {
        card = null;
      }
      if (card) id = modelTaskFromCard(card);
    }
    if (id) markTask(id, via);
    return id;
  }

  function onClick(e) {
    handleActivate(e.target, "click");
  }

  function onKeydown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    handleActivate(e.target, "keyboard");
  }

  function onPointerdown(e) {
    if (reported) return;
    var t = e.target;
    if (t && t.tagName === "CANVAS" && t.closest && t.closest(".viewer-wrapper")) {
      // взаимодействие с 3D-видом (не является заданием, но фиксируем
      // активность; можно использовать для future-proofing)
    }
  }

  function onInput(e) {
    /* не используется для заданий, обработчик оставлен зарезервированным */
  }

  /* ---- привязка обработчиков к документам --------------------------- */

  var attached = typeof WeakSet !== "undefined" ? new WeakSet() : null;
  var attachLists = {};

  function attachToDoc(doc) {
    if (!doc) return false;
    if (attached) {
      if (attached.has(doc)) return true;
      attached.add(doc);
    } else {
      // старые браузеры: уникальный ключ по tagName/location
      var key = doc.location ? doc.location.href : "doc";
      if (attachLists[key] === true) return true;
      /* в старых браузерах разрешаем повторную привязку (risk: дубли) */
    }
    doc.addEventListener("click", onClick);
    doc.addEventListener("keydown", onKeydown);
    doc.addEventListener("pointerdown", onPointerdown);
    doc.addEventListener("input", onInput);
    return true;
  }

  function scanForApp() {
    attachToDoc(global.document);
    var frames = global.document.querySelectorAll("#app iframe, iframe.app-frame, iframe");
    for (var i = 0; i < frames.length; i++) {
      try {
        var idoc = frames[i].contentDocument;
        if (idoc) attachToDoc(idoc);
      } catch (e) {
        /* cross-origin — пропускаем */
      }
    }
  }

  /* ---- жизненный цикл ---------------------------------------------- */

  function boot() {
    if (!SCORM) return;

    global.__SCORM_COURSE_HANDLING_UNLOAD__ = true;

    if (!SCORM.isInitialized()) {
      SCORM.init();
    }

    var ready = function () {
      if (document.body) {
        buildUI();
        render();
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(ready, 150);
      });
    } else {
      setTimeout(ready, 150);
    }

    // Слушаем события внутри iframe приложения (создаётся библиотекой).
    scanForApp();
    setInterval(scanForApp, 400);

    window.addEventListener("beforeunload", function () {
      if (!reported) finish();
    });
  }
  boot();

  /* ---- отладка ----------------------------------------------------- */

  global.courseTracker = {
    getState: function () {
      return {
        done: done,
        score: scorePercent(),
        completed: coreComplete(),
        reported: reported,
      };
    },
    finish: function () {
      return finish();
    },
  };
})(window);
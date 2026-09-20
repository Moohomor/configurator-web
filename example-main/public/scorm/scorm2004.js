/* =====================================================================
 * scorm2004.js
 * SCORM 2004 (4th Edition) runtime wrapper для курса «3D-конфигуратор».
 *
 * Отвечает за:
 *  - поиск API_1484_11 в окне SCO и выше по цепочке родительских окон;
 *  - инициализацию сессии (Initialize);
 *  - запись данных сессии (session_time, score, completion/success,
 *    interactions) и завершение (Commit + Terminate).
 *
 * Курсовой трекер (course.js) вызывает window.SCORM напрямую.
 * ===================================================================== */
(function (global) {
  "use strict";

  var API = null;
  var initialized = false;
  var terminated = false;
  var startTime = 0;

  /* ---- поиск API ------------------------------------------------- */

  function findAPI(win) {
    var depth = 0;
    while (win && depth < 50) {
      try {
        if (win.API_1484_11 !== undefined && win.API_1484_11 !== null) {
          return win.API_1484_11;
        }
      } catch (e) {
        /* cross-origin — пропускаем окно */
      }
      try {
        if (win.parent && win.parent !== win) {
          win = win.parent;
          depth += 1;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    return null;
  }

  function boolResult(value) {
    return value === true || String(value).toLowerCase() === "true";
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatDuration(seconds) {
    var s = Math.max(0, Math.floor(seconds));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(sec);
  }

  /* ---- публичный API --------------------------------------------- */

  global.SCORM = {
    isAvailable: function () {
      return !!API;
    },

    isInitialized: function () {
      return initialized;
    },

    /** Вызывается автоматически при загрузке страницы, но безопасно
     *  вызвать повторно из course.js. */
    init: function () {
      if (initialized || terminated) return initialized;
      API = findAPI(global);
      if (!API) return false;
      var result = API.Initialize("");
      initialized = boolResult(result);
      if (initialized) startTime = Date.now();
      return initialized;
    },

    get: function (name) {
      if (!API || !initialized) return null;
      return API.GetValue(name, "");
    },

    set: function (name, value) {
      if (!API || !initialized) return false;
      var result = API.SetValue(name, String(value), "");
      return boolResult(result);
    },

    commit: function () {
      if (!API || !initialized) return false;
      return boolResult(API.Commit(""));
    },

    elapsedSeconds: function () {
      return startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    },

    /**
     * Записать интеракцию в локальный буфер.
     * Данные будут отправлены LMS при report().
     */
    addInteraction: function (id, type, description, result) {
      this._interactions = this._interactions || [];
      this._interactions.push({
        id: id,
        type: type || "other",
        description: description || "",
        result: result || "unanticipated",
        timestamp: new Date().toISOString(),
        latency: "0000:00:00",
      });
    },

    getLocalInteractions: function () {
      return this._interactions || [];
    },

    /**
     * Полная запись результата сессии в LMS с последующим Commit+Terminate.
     * options: { score, min, max, completionStatus, successStatus,
     *            exit, location, interactions, elapsedSeconds }
     */
    report: function (options) {
      if (!API || !initialized || terminated) {
        return false;
      }
      var opts = options || {};
      var ok = true;
      var i, p, it;

      ok = this.set(
        "cmi.session_time",
        formatDuration(
          opts.elapsedSeconds != null
            ? opts.elapsedSeconds
            : this.elapsedSeconds(),
        ),
      ) && ok;

      if (opts.score != null) {
        ok = this.set("cmi.score.raw", String(opts.score)) && ok;
        ok = this.set(
          "cmi.score.min",
          String(opts.min != null ? opts.min : 0),
        ) && ok;
        ok = this.set(
          "cmi.score.max",
          String(opts.max != null ? opts.max : 100),
        ) && ok;
      }

      if (opts.completionStatus) {
        ok = this.set("cmi.completion_status", opts.completionStatus) && ok;
      }
      if (opts.successStatus) {
        ok = this.set("cmi.success_status", opts.successStatus) && ok;
      }
      if (opts.location != null) {
        ok = this.set("cmi.location", String(opts.location)) && ok;
      }

      var interactions =
        opts.interactions && opts.interactions.length
          ? opts.interactions
          : this.getLocalInteractions();

      ok = this.set("cmi.interactions._count", String(interactions.length)) && ok;
      for (i = 0; i < interactions.length; i += 1) {
        it = interactions[i];
        p = "cmi.interactions." + i;
        ok = this.set(p + ".id", it.id) && ok;
        ok = this.set(p + ".type", it.type || "other") && ok;
        ok = this.set(p + ".timestamp", it.timestamp) && ok;
        ok = this.set(p + ".result", it.result || "unanticipated") && ok;
        if (it.description) {
          ok = this.set(p + ".description", it.description) && ok;
        }
      }

      ok = this.set("cmi.exit", opts.exit || "normal") && ok;
      ok = this.commit() && ok;
      terminated = true;
      try {
        boolResult(API.Terminate(""));
      } catch (e) {
        ok = false;
      }
      return ok;
    },

    /** Быстрая «аварийная» финализация без данных курса (если course.js
     *  не успел обработать уход со страницы). */
    flush: function () {
      if (!API || !initialized || terminated) return false;
      var ok = true;
      ok = this.set(
        "cmi.session_time",
        formatDuration(this.elapsedSeconds()),
      ) && ok;
      ok = this.set("cmi.exit", "suspend") && ok;
      ok = this.commit() && ok;
      terminated = true;
      try {
        boolResult(API.Terminate(""));
      } catch (e) {
        ok = false;
      }
      return ok;
    },
  };

  /* ---- автозапуск ------------------------------------------------ */

  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        global.SCORM.init();
      });
    } else {
      global.SCORM.init();
    }
  }
  boot();

  /* ---- страховка при уходе со страницы --------------------------- */

  window.addEventListener("beforeunload", function () {
    // course.js (если загружен) сам выполняет full-report; не дублируем.
    if (global.__SCORM_COURSE_HANDLING_UNLOAD__) return;
    if (API && initialized && !terminated) {
      try {
        global.SCORM.flush();
      } catch (e) {
        /* ignore */
      }
    }
  });
})(window);
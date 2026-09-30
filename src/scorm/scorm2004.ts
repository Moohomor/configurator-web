/* =====================================================================
 * scorm/scorm2004.ts
 * Низкоуровневый адаптер SCORM 2004 (4th Edition) поверх API_1484_11.
 * Никакой логики курса: только поиск API, Initialize/Commit/Terminate,
 * чтение и запись cmi.*. Слой выше (runtime.ts) превращает это в
 * интерфейс LearningRuntime.
 * ===================================================================== */
import type { InteractionRecord } from "@/api/types";

/** Минимальный набор методов, который обязана отдавать LMS. */
export interface Scorm2004Api {
  Initialize(parameter: string): string;
  Terminate(parameter: string): string;
  Commit(parameter: string): string;
  GetValue(element: string, parameter: string): string;
  SetValue(element: string, value: string, parameter: string): string;
}

/**
 * Ищет API в текущем окне и выше по цепочке родительских окон.
 * Это требование SCORM (LMS прячет API в родителе), а не обход:
 * в LMS контент всегда лежит во фрейме.
 */
export function findScorm2004Api(
  start: Window = window,
  maxDepth = 50,
): Scorm2004Api | null {
  let win: Window | null = start;
  let depth = 0;

  while (win && depth < maxDepth) {
    try {
      const api = (win as unknown as Record<string, unknown>).API_1484_11;
      if (api && typeof api === "object") {
        return api as Scorm2004Api;
      }
    } catch {
      /* кросс-доменное окно — пропускаем */
    }
    try {
      if (win.parent && win.parent !== win) {
        win = win.parent;
        depth += 1;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return null;
}

export function isTrue(value: unknown): boolean {
  return value === true || String(value).toLowerCase() === "true";
}

/** cmi.session_time в формате HH:MM:SS. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  return (
    pad(Math.floor(total / 3600)) +
    ":" +
    pad(Math.floor((total % 3600) / 60)) +
    ":" +
    pad(total % 60)
  );
}

const SUSPEND_DATA_LIMIT = 4096;

/** Одна сессия SCORM: состояние Initialize/Commit/Terminate. */
export class Scorm2004Session {
  private initialized = false;
  private terminated = false;
  private startedAt = 0;

  constructor(private readonly api: Scorm2004Api) {}

  get isInitialized(): boolean {
    return this.initialized;
  }

  get isTerminated(): boolean {
    return this.terminated;
  }

  /** Вызывается один раз за SCO-сессию; повторные вызовы безопасны. */
  initialize(): boolean {
    if (this.initialized || this.terminated) return this.initialized;
    this.initialized = isTrue(this.api.Initialize(""));
    if (this.initialized) this.startedAt = Date.now();
    return this.initialized;
  }

  get(name: string): string | null {
    if (!this.initialized) return null;
    const value = this.api.GetValue(name, "");
    return value || null;
  }

  set(name: string, value: string): boolean {
    if (!this.initialized || this.terminated) return false;
    return isTrue(this.api.SetValue(name, String(value), ""));
  }

  commit(): boolean {
    if (!this.initialized || this.terminated) return false;
    return isTrue(this.api.Commit(""));
  }

  terminate(): boolean {
    if (!this.initialized || this.terminated) return false;
    const ok = isTrue(this.api.Terminate(""));
    this.terminated = true;
    return ok;
  }

  get elapsedSeconds(): number {
    return this.startedAt
      ? Math.round((Date.now() - this.startedAt) / 1000)
      : 0;
  }

  /** Пишет массив интеракций в cmi.interactions.n.* */
  writeInteractions(interactions: readonly InteractionRecord[]): boolean {
    let ok = this.set("cmi.interactions._count", String(interactions.length));
    interactions.forEach((interaction, index) => {
      const base = `cmi.interactions.${index}`;
      ok = this.set(`${base}.id`, interaction.id) && ok;
      ok = this.set(`${base}.type`, interaction.type) && ok;
      ok = this.set(`${base}.timestamp`, interaction.timestamp) && ok;
      ok = this.set(`${base}.result`, interaction.result) && ok;
      if (interaction.description) {
        ok = this.set(`${base}.description`, interaction.description) && ok;
      }
    });
    return ok;
  }

  /** suspend_data с молчаливым обрезанием по лимиту LMS. */
  writeSuspendData(value: unknown): boolean {
    let json = JSON.stringify(value ?? null);
    if (json.length > SUSPEND_DATA_LIMIT) {
      json = json.slice(0, SUSPEND_DATA_LIMIT);
    }
    return this.set("cmi.suspend_data", json);
  }

  writeScore(score: number, min = 0, max = 100): boolean {
    let ok = this.set("cmi.score.raw", String(score));
    ok = this.set("cmi.score.min", String(min)) && ok;
    ok = this.set("cmi.score.max", String(max)) && ok;
    return ok;
  }
}

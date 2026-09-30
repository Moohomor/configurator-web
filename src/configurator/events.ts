/* =====================================================================
 * configurator/events.ts
 * Семантические события конфигуратора. Их знает и 3D-UI, и SCORM-слой —
 * трекеру не нужно знать ни про CSS-классы, ни про DOM.
 * ===================================================================== */
import type { Model, ModelPart, TexturePack } from "./types/models";

export interface ConfiguratorEventMap {
  /** 3D-сцена загружена, детали извлечены. */
  "model-loaded": { model: Model; parts: number; hasAnimations: boolean };
  /** Пользователь выбрал (или снял выбор) деталь. */
  "part-selected": { part: ModelPart | null };
  /** Выбран другой текстур-пак. */
  "texture-changed": { pack: TexturePack | null };
  /** Запущено воспроизведение анимации. */
  "animation-played": Record<string, never>;
  /** Изменилась видимость деталей. */
  "parts-visibility-changed": { hidden: number };
}

export type ConfiguratorEvent = keyof ConfiguratorEventMap;

/**
 * Событие и полезная нагрузка как единый discriminated union: так
 * подписчик получает правильно типизированный payload после сужения
 * по `signal.event` (в отличие от пары «строковое имя + any»).
 */
export type ConfiguratorEventSignal = {
  [E in ConfiguratorEvent]: { event: E; payload: ConfiguratorEventMap[E] };
}[ConfiguratorEvent];

export type ConfiguratorEventHandler = (signal: ConfiguratorEventSignal) => void;

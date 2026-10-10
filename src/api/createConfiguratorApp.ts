/* =====================================================================
 * api/createConfiguratorApp.ts
 * Composition root: единственное место, где собираются зависимости.
 * Никаких window.init() / window.mount() в разных файлах и в разное
 * время — всё передаётся явно, одной структурой опций.
 * ===================================================================== */
import { createApp, type App as VueApp } from "vue";
import AppRoot from "@/app/App.vue";
import type { ConfiguratorAppOptions } from "./types";

export interface ConfiguratorApp {
  app: VueApp;
  /** Монтирует приложение в контейнер. Повторный вызов игнорируется. */
  mount(): VueApp;
}

/**
 * Создаёт приложение конфигуратора.
 *
 * ```ts
 * mountConfigurator({
 *   catalog: new StaticJsonCatalog(),
 *   runtime: createLearningRuntime(),
 *   lessonId: "loco-ep20",   // урок; не задавать — каталог
 * });
 * ```
 */
export function createConfiguratorApp(
  options: ConfiguratorAppOptions,
): ConfiguratorApp {
  const selector = options.selector ?? "#app";
  const container = document.querySelector(selector);
  if (!container) {
    throw new Error(
      `Конфигуратор: контейнер "${selector}" не найден на странице`,
    );
  }

  const app = createApp(AppRoot, {
    catalog: options.catalog,
    runtime: options.runtime,
    lessonId: options.lessonId ?? null,
  });

  let mounted = false;
  return {
    app,
    mount: () => {
      if (!mounted) {
        app.mount(container);
        mounted = true;
      }
      return app;
    },
  };
}

/** Сокращение для встраивания: создать и сразу смонтировать. */
export function mountConfigurator(
  options: ConfiguratorAppOptions,
): ConfiguratorApp {
  const created = createConfiguratorApp(options);
  created.mount();
  return created;
}

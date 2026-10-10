/* =====================================================================
 * main.ts — точка входа приложения.
 *
 * Одна функция, три явных зависимости: откуда каталог, через что
 * учимся, какой урок открыть. Никаких window.init() / window.mount(),
 * разнесённых по времени и файлам: composition root — здесь.
 * ===================================================================== */
import "@/configurator/styles/global.css";
import { createConfiguratorApp } from "@/api/createConfiguratorApp";
import { StaticJsonCatalog } from "@/catalog/staticCatalog";
import { currentLessonId, embedMode } from "@/scorm/lesson";
import { createEmbedRuntime, createLearningRuntime } from "@/scorm/runtime";

/*
 * Режим встраивания выбирается ДО всякого поиска API: createLearningRuntime
 * находит API_1484_11 в родителях и открыл бы чужую сессию своим Initialize.
 * createEmbedRuntime этого не делает никогда — даже если API есть.
 */
const mode = embedMode();
const runtime = mode ? createEmbedRuntime(mode) : createLearningRuntime();
runtime.start();

createConfiguratorApp({
  catalog: new StaticJsonCatalog(),
  runtime,
  lessonId: currentLessonId(),
}).mount();

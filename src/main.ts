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
import { currentLessonId } from "@/scorm/lesson";
import { createLearningRuntime } from "@/scorm/runtime";

const runtime = createLearningRuntime();
runtime.start();

createConfiguratorApp({
  catalog: new StaticJsonCatalog(),
  runtime,
  lessonId: currentLessonId(),
}).mount();

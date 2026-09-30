import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { scormLessonEntries } from "./scripts/vite-plugin-lessons";

export default defineConfig({
  // base: "./" — относительные пути сборки. Внутри LMS контент раздаётся
  // из произвольного подкаталога, абсолютные пути вели бы в корень сервера.
  base: "./",

  plugins: [
    vue(),
    // По одной HTML-точке входа на каждый урок (lesson-<id>.html).
    scormLessonEntries(path.resolve(__dirname, "src/catalog/models.json")),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    // Каталог моделей тянет Vue и JSON, но не three.js: 3D-сцена уезжает в
    // отдельный чанк и грузится только на странице урока (defineAsyncComponent).
    chunkSizeWarningLimit: 1500,
  },
});

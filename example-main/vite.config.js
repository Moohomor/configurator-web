import { defineConfig } from "vite";

// base: './' — относительные пути вместо абсолютных.
// Необходимо для корректной работы курса внутри iframe LMS (SCORM),
// где контент раздаётся из произвольного подкаталога.
export default defineConfig({
  base: "./",
});
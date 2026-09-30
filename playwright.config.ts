import { defineConfig, devices } from "@playwright/test";

const PORT = 5184;

/**
 * Тесты гоняются по собранному dist/ — тем же файлам, что уезжают в
 * SCORM-пакет. Сборка запускается автоматически (webServer).
 */
export default defineConfig({
  testDir: "./tests",
  // Тесты открывают настоящие 3D-сцены: программный WebGL в headless
  // Chromium жрёт ядра, поэтому параллельные воркеры на машине разработчика
  // (и в CI) только мешают друг другу.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],

  timeout: 120_000,
  expect: { timeout: 20_000 },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // --host 127.0.0.1: иначе vite preview слушает только localhost, а
    // проверка готовности идёт по 127.0.0.1 и не дожидается ответа.
    command:
      "npm run build && npm run preview -- --port 5184 --strictPort --host 127.0.0.1",
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

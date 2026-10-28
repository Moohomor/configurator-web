import { test, expect } from "@playwright/test";

// Плашка анимации. На десктопе она свёрнута в пилюлю и разворачивается
// кнопкой; в развёрнутом виде показывает полосу прокрутки, скорость и
// повтор.
//
// Модель — `reductor` (2,4 МБ, анимация 39 с): основной тестовый урок
// `sa-3` без анимаций, у 81-775 и tem23 «анимация» — статичная поза на
// 1/30 с (её отсекает isPlayableClip), а ЭП20 на 29 МБ в тестах не
// открывается.
const LESSON = "reductor";
const LESSON_TITLE = "Редуктор";

test.describe("плашка анимации", () => {
  test("по умолчанию свёрнута, разворачивается и меняет скорость", async ({
    page,
  }) => {
    await page.goto(`/index.html?lesson=${LESSON}`);
    const app = page.locator(".app");

    await expect(app.locator(".lesson-title")).toContainText(LESSON_TITLE);

    // Плашка появляется только после разбора сцены: наличие анимаций
    // приходит из загруженной модели, а не из каталога.
    await expect(app.locator(".animation-controls")).toBeVisible({
      timeout: 90_000,
    });
    await expect(app.locator(".pill")).toBeVisible();
    await expect(app.locator(".controls-header")).toHaveCount(0);

    // Развернуть: появляются полоса, скорость и повтор.
    await app.locator(".pill-expand").click();
    await expect(app.locator(".controls-header")).toBeVisible();
    await expect(app.locator(".progress-bar")).toBeVisible();
    await expect(app.locator(".speed-trigger")).toBeVisible();
    await expect(app.locator(".loop-control")).toBeVisible();
    await expect(app.locator(".pill")).toHaveCount(0);

    // Скорость — свой список (нативный select раскрывался вниз и
    // вылезал за плашку). Выбор закрывает список и меняет подпись.
    await app.locator(".speed-trigger").click();
    await expect(app.locator(".speed-menu")).toBeVisible();
    await app.getByRole("option", { name: "2x", exact: true }).click();
    await expect(app.locator(".speed-menu")).toHaveCount(0);
    await expect(app.locator(".speed-trigger")).toContainText("2x");

    // Свернуть обратно в пилюлю.
    await app.locator(".collapse-btn").click();
    await expect(app.locator(".pill")).toBeVisible();
    await expect(app.locator(".controls-body")).toHaveCount(0);
  });
});

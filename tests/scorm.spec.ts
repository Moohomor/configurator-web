import { expect, test } from "@playwright/test";
import { cmiLog, cmiValues, openScoInLms, scoFrame } from "./fakeLms";

/**
 * Урок для e2e — автосцепка СА-3: её GLB весит 1,5 МБ, тогда как ЭП20 —
 * 29 МБ, и разбор такого файла блокирует поток отрисовки headless-браузера
 * на десятки секунд. Проверка остальных семи уроков — по наличию их
 * HTML-точек входа (тест ниже), без открытия 3D.
 */
const LESSON = "sa-3";
const LESSON_TITLE = "СА-3";

test.describe("архитектура SCO", () => {
  test("приложение не создаёт собственный iframe", async ({ page }) => {
    await openScoInLms(page, "/index.html");

    // Внутри LMS иерархия ровно двух уровней: LMS → SCO. Раньше было три
    // (LMS → SCO → iframe приложения), и весь DOM жил во внутреннем фрейме.
    expect(page.frames()).toHaveLength(2);
    expect(await page.frameLocator("#sco").locator("iframe").count()).toBe(0);
  });

  test("SCO без параметра урока открывается как каталог", async ({ page }) => {
    await openScoInLms(page, "/index.html");
    const app = page.frameLocator("#sco");

    await expect(app.locator(".catalog")).toBeVisible();
    await expect(app.locator(".lesson")).toHaveCount(0);
    expect(await page.evaluate(() => window.__cmiSession.initialized)).toBe(
      true,
    );
  });

  test("Initialize вызывается ровно один раз", async ({ page }) => {
    await openScoInLms(page, "/index.html");
    const log = await cmiLog(page);
    expect(log.filter((e) => e.method === "Initialize")).toHaveLength(1);
  });
});

test.describe("прямая ссылка на урок", () => {
  test("?lesson= открывает урок, минуя каталог", async ({ page }) => {
    await openScoInLms(page, `/index.html?lesson=${LESSON}`);
    const app = page.frameLocator("#sco");

    await expect(app.locator(".lesson")).toBeVisible();
    await expect(app.locator(".catalog")).toHaveCount(0);
    await expect(app.locator(".lesson-title")).toContainText(LESSON_TITLE);
  });

  test("lesson-<id>.html открывает тот же урок", async ({ page }) => {
    await openScoInLms(page, `/lesson-${LESSON}.html`);
    const app = page.frameLocator("#sco");

    await expect(app.locator(".lesson-title")).toContainText(LESSON_TITLE);
    expect(await page.evaluate(() => window.__cmiSession.initialized)).toBe(
      true,
    );
  });

  test("каждая модель с 3D имеет отдельную HTML-точку входа", async ({
    page,
  }) => {
    const lessons = [
      "loco-ep20",
      "loco-tem23",
      "metro-moscow-2020",
      "ed4m_car",
      "train-ivolga-3",
      "reductor",
      "sa-3",
      "truck",
    ];
    for (const id of lessons) {
      const response = await page.request.get(`/lesson-${id}.html`);
      expect(response.status(), `lesson-${id}.html`).toBe(200);
      expect(await response.text()).toContain(`"id":"${id}"`);
    }
  });
});

test.describe("навигация каталог ↔ урок", () => {
  test("внутри LMS каталог не ведёт в уроки: их открывает меню курса", async ({
    page,
  }) => {
    await openScoInLms(page, "/index.html");
    const app = page.frameLocator("#sco");

    await app.getByRole("tab", { name: "Детали" }).click();

    // Карточка не ссылка: внутри LMS уроки открываются из меню курса,
    // и кажущаяся возможность уйти в урок из галереи только путает.
    await expect(app.locator(`[href*="lesson=${LESSON}"]`)).toHaveCount(0);
    await expect(app.locator(".card--static")).not.toHaveCount(0);
    await expect(
      app.locator(".catalog-lead"),
    ).toContainText("меню курса");

    // Оценка при этом всё равно считается по курсу целиком.
    await expect(app.locator(".course-panel")).toBeVisible();
  });

  test("вне LMS карточка — ссылка, переход не перезагружает документ", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as Window & { __docStamp?: string }).__docStamp =
        Math.random().toString(36).slice(2);
    });
    await page.goto("/index.html");
    const app = page.locator(".app");

    await app.getByRole("tab", { name: "Детали" }).click();

    const card = app.locator(`a.card[href*="lesson=${LESSON}"]`).first();
    await expect(card).toBeVisible();

    const stampBefore = await page.evaluate(
      () => (window as Window & { __docStamp?: string }).__docStamp,
    );
    await card.click();

    await expect(app.locator(".lesson-title")).toContainText(LESSON_TITLE);
    // Тот же документ: pushState вместо перехода по ссылке.
    expect(
      await page.evaluate(
        () => (window as Window & { __docStamp?: string }).__docStamp,
      ),
    ).toBe(stampBefore);
    expect(page.url()).toContain(`lesson=${LESSON}`);
  });

  test("«в каталог» возвращает к галерее", async ({ page }) => {
    await openScoInLms(page, `/index.html?lesson=${LESSON}`);
    const app = page.frameLocator("#sco");

    await app.locator(".lesson-back").click();
    await expect(app.locator(".catalog")).toBeVisible();
    await expect(app.locator(".lesson")).toHaveCount(0);
  });

  test("в режиме --lessons=files кнопка «в каталог» ведёт на index.html", async ({
    page,
  }) => {
    // SCO открыт как отдельный документ lesson-<id>.html: каталог лежит в
    // другом документе, и по «текущему пути без query» мы бы остались в
    // том же уроке.
    await openScoInLms(page, `/lesson-${LESSON}.html`);

    const back = page.frameLocator("#sco").locator(".lesson-back");
    await expect(back).toHaveAttribute("href", "/index.html");

    await back.click();
    await expect(page.frameLocator("#sco").locator(".catalog")).toBeVisible();
  });
});

test.describe("учёт заданий", () => {
  test("загрузка 3D-сцены засчитывает задание и пишет cmi.suspend_data", async ({
    page,
  }) => {
    await openScoInLms(page, `/index.html?lesson=${LESSON}`);

    // Отметка ставится по событию model-loaded, а не по появлению DOM:
    // ждём именно данных, пришедших в LMS.
    await expect
      .poll(async () => (await cmiValues(page))["cmi.suspend_data"], {
        timeout: 60_000,
      })
      .toContain(LESSON);

    const state = JSON.parse(
      (await cmiValues(page))["cmi.suspend_data"]!,
    ) as Record<string, { openedAt: string | null } | undefined>;
    expect(state[LESSON]?.openedAt).toBeTruthy();

    // Оценка уходит сразу, а не по кнопке «завершить»: иначе LMS до ухода
    // со страницы показывает 0/0 и теряет сделанную работу.
    const values = await cmiValues(page);
    expect(values["cmi.score.max"]).toBe("100");
    expect(Number(values["cmi.score.raw"])).toBeGreaterThan(0);
    expect(values["cmi.completion_status"]).toBe("incomplete");
  });

  test("переключение вкладки не закрывает сессию и не теряет прогресс", async ({
    page,
  }) => {
    await openScoInLms(page, `/index.html?lesson=${LESSON}`);
    await expect
      .poll(async () => (await cmiValues(page))["cmi.score.raw"], {
        timeout: 60_000,
      })
      .toBeTruthy();

    // SCO уходит в фон: alt-tab, клик на окно LMS, соседняя вкладка.
    const sco = scoFrame(page);
    await sco.evaluate(() => {
      Object.defineProperty(Document.prototype, "hidden", {
        get: () => true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    });
    await expect
      .poll(async () => await page.evaluate(() => window.__cmiSession.terminated))
      .toBe(false);

    // Пользователь вернулся и отметил ещё одно задание.
    const before = Number((await cmiValues(page))["cmi.score.raw"]);
    await page
      .frameLocator("#sco")
      .locator(".part-info")
      .first()
      .click({ timeout: 30_000 });
    await expect
      .poll(async () => Number((await cmiValues(page))["cmi.score.raw"]))
      .toBeGreaterThan(before);
  });

  test("«завершить» отправляет score, completion, interactions и Terminate", async ({
    page,
  }) => {
    await openScoInLms(page, `/index.html?lesson=${LESSON}`);
    const app = page.frameLocator("#sco");

    await expect(app.locator(".course-panel")).toBeVisible();
    await expect
      .poll(async () => (await cmiValues(page))["cmi.suspend_data"], {
        timeout: 60_000,
      })
      .toContain(LESSON);

    // На уроке панель по умолчанию свёрнута — она лежит поверх сцены.
    await app.locator(".course-panel__toggle").click();
    await app.locator(".course-panel__finish").click();

    const values = await cmiValues(page);
    // Открыт один урок из восьми: курс не завершён, результат — suspend.
    expect(values["cmi.completion_status"]).toBe("incomplete");
    expect(values["cmi.exit"]).toBe("suspend");
    expect(values["cmi.success_status"]).toBeTruthy();
    const raw = Number(values["cmi.score.raw"]);
    expect(Number.isFinite(raw)).toBe(true);
    expect(raw).toBeGreaterThanOrEqual(0);
    expect(raw).toBeLessThan(100);
    expect(values["cmi.interactions._count"]).toBeTruthy();
    expect(values["cmi.interactions.0.id"]).toBe(`${LESSON}.open`);

    const log = await cmiLog(page);
    expect(log[log.length - 1]?.method).toBe("Terminate");
    expect(await page.evaluate(() => window.__cmiSession.terminated)).toBe(
      true,
    );
  });
});

test.describe("автономный режим", () => {
  test("вне LMS прогресс живёт в localStorage", async ({ page }) => {
    await page.goto(`/index.html?lesson=${LESSON}`);
    await expect(page.locator(".lesson")).toBeVisible();
    await expect(page.locator(".course-panel__runtime")).toContainText(
      "вне LMS",
    );

    await expect
      .poll(
        async () =>
          page.evaluate(
            () => localStorage.getItem("configurator:course-progress") ?? "",
          ),
        { timeout: 60_000 },
      )
      .toContain(LESSON);
  });
});
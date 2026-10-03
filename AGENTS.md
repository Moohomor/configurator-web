# AGENTS.md

Vue 3 + three.js, упаковано в SCORM 2004 (4th Edition) для WebSoft HCM.
Про правила подсчёта оценки и адреса уроков — `SCORM-README.md`, для пользователя — `README.md`.

## Команды

Windows-кнут: `npm.ps1` заблокирован политикой выполнения → `npm.cmd`. `npx` → `npx.cmd`.

```powershell
npm.cmd install        # один раз
npm.cmd run dev        # 5173
npm.cmd run typecheck  # vue-tsc --noEmit
npm.cmd run build      # уже включает typecheck — отдельно звать не надо
npm.cmd run preview
npm.cmd run build:scorm         # build + упаковка (--lessons=params, по умолчанию)
npm.cmd run build:scorm:files   # build + упаковка (--lessons=files)
npm.cmd test                    # Playwright, ~3 мин
```

Линтера и форматтера в проекте нет — не выдумывай конфиг, не запускай `eslint`/`prettier`.

Один тест: `npx.cmd playwright test -g "Initialize"`. Перед `npm.cmd test` собирать не нужно: `webServer` в `playwright.config.ts` сам выполняет `npm run build` и поднимает `vite preview` на 5184 (`--strictPort` — порт должен быть свободен, иначе упадёт невнятно).

Ручная имитация LMS: `python -m http.server 5000` из корня → `/scorm-test/lms-simulator.html` (лог `cmi.*`, переключатель «каталог / урок»).

## Структура

Одно приложение в корне. Раньше было два пакета (`configurator-main` + `example-main` через `file:`), из-за чего порядок сборки был обязателен; сейчас `npm install` и `npm run build` по одному.

```
index.html    единственная HTML-точка входа: каталог, с ?lesson= — урок
src/main.ts   composition root: catalog + runtime + lessonId → mount()
src/api/      КОНТРАКТЫ: types.ts (ModelCatalogSource, LearningRuntime) + сборка зависимостей
src/catalog/  models.json — единственный источник каталога; ModelSelector, StaticJsonCatalog
src/configurator/  3D-UI: components/, useConfigurator.ts, events.ts, types/, styles/global.css
src/scorm/    адаптер LMS: scorm2004.ts, runtime.ts, lessons.ts, tracker.ts, lesson.ts
src/pages/    CatalogPage, LessonPage, CourseProgressPanel
src/app/App.vue  корневой каркас: решает «каталог или урок»
scripts/      catalog.mjs (+ .d.mts), vite-plugin-lessons.ts, package-scorm.mjs
tests/        Playwright: scorm.spec.ts + fakeLms.ts
public/       models/, tmh-previews/ — копируются в dist как есть
```

Два неочевидных момента:

- **three.js грузится только на уроке.** `ModelViewer` подключён через `defineAsyncComponent` (`LessonPage.vue`) и попадает в отдельный чанк. Каталог отдаёт ~150 КБ, урок добавляет ~610 КБ. Если увидишь three.js в чанке каталога — сломал ленивую загрузку.
- **`scripts/catalog.mjs` — обычный JS без типов:** его импортируют и `vite.config.ts` (через esbuild), и `package-scorm.mjs` (чистый Node). Типы для TS лежат в `scripts/catalog.d.mts`. Если превратить его в `.ts`, упаковщик начнёт требовать `--experimental-strip-types`.

## Приложение НЕ создаёт собственный iframe

Главное архитектурное ограничение. Раньше библиотека монтировала весь UI внутрь `<iframe>` с инъекцией стилей строкой — отсюда вложенность LMS → SCO → iframe, 400-мс polling и опознавание заданий по тексту `.card-name`. Теперь UI рендерится прямо в документе SCO, CSS идёт обычным конвейером Vite.

Что из этого следует и ломается легко:

- **SCORM-слой не нюхает DOM.** Задания приходят из `useConfigurator` как семантические события (`model-loaded`, `part-selected`, `animation-played`). Новый UI-элемент — пробрасывай событие, а не класс в разметке.
- **Пути относительные**, от `document.baseURI`; в `vite.config.ts` — `base: "./"`. Обращения к `window.parent.location.href` запрещены: родитель — страница системы, кросс-домен.
- **Поиск `API_1484_11` вверх по родительским окнам — требование SCORM**, а не костыль. Обрыв на кросс-домене — ожидаемое поведение, не ошибка.
- **Навигация только через `history.pushState`** (`src/scorm/lesson.ts`). Перезагрузка документа = второй `Initialize` в одной сессии LMS.

## Уроки

Каждая модель с 3D — отдельный урок курса, доступный по прямой ссылке. Два способа, приложение понимает оба: `index.html?lesson=<id>` и `lesson-<id>.html` (генерируются `scripts/vite-plugin-lessons.ts` после сборки из уже собранного `index.html`).

Зона ответственности SCO решается при запуске (`currentScope()`): `lesson-<id>.html` → один урок; каталог, в т.ч. `?lesson=` из `<parameters>` → весь курс.

> Известное ограничение режима `--lessons=files`: SCO открыт как `lesson-<id>.html`,
> поэтому смена урока — это смена документа, а не `pushState`. Переход в каталог
> и обратно строит путь до `index.html` (`buildHref` в `lesson.ts`); внутри одного
> документа по-прежнему `pushState`, чтобы не было второго `Initialize`.

Упаковка (`scripts/package-scorm.mjs`):

- **ZIP только через Python `zipfile`.** `Compress-Archive` и `.NET ZipFile` пишут записи с обратными слэшами — LMS на Linux такой пакет не импортирует. Не менять.
- Оба режима пишут в **один и тот же** `configurator-web-scorm2004.zip`, перетирая друг друга. Нужны оба архива подряд — переименовывай вручную.
- `imsmanifest.xml` генерируется из содержимого `dist`, руками не править. Оба режима проверены: ZIP на 178 записей, обратных слэшей 0.
- Режим `params` требует, чтобы LMS понимала `<parameters>`. Отказ тихий: импорт проходит, но все уроки открывают каталог. Признак — импортируй в HCM и кликай по уроку; если открылся каталог, пересобери `--lessons=files`.

## Задания и оценка

`src/scorm/lessons.ts`: три задания на урок (`open`, `part`, `animation`) — событие-источник, обязательность, условие применимости. Оценка и `cmi.interactions` собираются чистыми функциями оттуда же, без Vue и без SCORM. Анимация засчитывается, только если она реально есть в модели: это выясняется из загруженной сцены (`model-loaded` несёт `hasAnimations`), а не из флага в каталоге. `PASS_PERCENT = 67`.

**В знаменатель оценки входят только обязательные задания** (2 на урок). Анимация засчитывается не у всех моделей, и с ней знаменатель прыгал бы 16 → 17 → 18 по мере просмотра моделей: правая часть дроби обязана быть постоянной, иначе прогресс в LMS не отслеживается. Бонус виден в панели отдельно.

**Оценка уходит в LMS на каждое выполненное задание**, а не по кнопке «завершить» (`LearningRuntime.report()` против `finish()`). Проверяй это при изменениях: если отправка осталась только в `finish()`, LMS до ухода со страницы показывает 0/0 и теряет работу.

**`Terminate` нельзя вешать на `visibilitychange`.** Документ SCO уходит в фон при alt-tab, клике на окно LMS и открытии соседней вкладки; закрытая там сессия отклоняет все последующие `SetValue`, и прогресс теряется. Сессия закрывается на `pagehide` / `beforeunload`.

`Scorm2004Runtime` выбирается **по нахождению `API_1484_11`**, а не по успешности `Initialize`: молчаливый переход на `LocalRuntime` внутри LMS увёл бы прогресс в `localStorage` мимо журнала. Если `Initialize` не удался, `inLms` остаётся `false` и запись в LMS отбрасывается — интерфейс прежний. `Initialize` зовёт только `start()`: вызов из конструктора дал бы второй `Initialize` и нарушил SCORM.

`cmi.score.min` и `cmi.score.max` пишутся **до** `raw`: часть LMS читает границы один раз, при первом обращении к score, и иначе до конца сессии показывает 0/0.

## Каталог моделей

`src/catalog/models.json` — единственный источник. Урок = запись с непустым `path` (8 штук). Остальные — заглушки без `path`, в уроки не попадают. Пути относительные, без ведущего `/`.

Новая модель: GLB кладём в `public/models/<имя>/`, запись добавляем в `models.json` с непустым `path`. Она автоматически попадёт и в сборку, и в манифест, и в уроки (`readLessons`), и получит свой `lesson-<id>.html`. **Имя файла — ASCII:** кириллица ломает импорт на Linux-LMS (модель редуктора поэтому `models/reductor/reductor.glb`).

## Тесты

`tests/scorm.spec.ts` — единственный автотест. `tests/fakeLms.ts` подставляет фейковый `API_1484_11` в родительское окно и открывает SCO во вложенном iframe, как в настоящей LMS. Проверяются: `Initialize` ровно один, отсутствие вложенного iframe (`page.frames().length === 2`), прямые адреса уроков, навигация без перезагрузки, `suspend_data`, отправка `score`/`completion`/`interactions` + `Terminate`.

Почему тесты идут ~3 минуты — не чини, это не тормоз:

- `workers: 1` и `timeout: 120_000`. Программный WebGL в headless Chromium грузит машину; на параллельных воркерах тесты падали на ровном месте.
- Урок в тестах — `sa-3` (1,5 МБ). ЭП20 — это 29 МБ GLB, разбор которого блокирует поток отрисовки и срывает таймауты. Остальные семь уроков проверяются наличием своих `lesson-<id>.html`, без открытия 3D.

## CI и git

`.github/workflows/ci.yml`: два job на каждом push/PR — `typecheck-and-build` (`npm ci` → typecheck → build → упаковка в обоих режимах) и `e2e` (Playwright). Jest, сборка библиотеки и покрытие кода больше не существуют.

Не коммитить: `dist/`, `node_modules/`, `scorm-package/`, `*.zip`, `test-results/`, `playwright-report/`.
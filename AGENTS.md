# AGENTS.md

Приложение «3D-конфигуратор подвижного состава» (Vue 3 + three.js), упакованное в SCORM 2004 (4th Edition) пакет для WebSoft HCM. Вводная по SCORM — `SCORM-README.md`.

## Один репозиторий, один пакет, один `npm install`

Раньше было два пакета через `file:`-связку (`configurator-main` — библиотека, `example-main` — SCO, использующий **уже собранный** `dist` библиотеки), из-за чего порядок сборки был обязателен, а логика делилась между пакетами произвольно. Сейчас это одно Vue-приложение в корне: `src/` целиком, `dist/` на выходе. `npm install` один, `npm run build` один, ловушки «module not found» нет.

```
index.html            единственная HTML-точка входа (каталог; с ?lesson= — урок)
src/
  main.ts             entry: три явные зависимости → createConfiguratorApp(...).mount()
  api/                КОНТРАКТЫ: types.ts (ModelCatalogSource, LearningRuntime) + composition root
  catalog/            models.json — единственный источник каталога; ModelSelector, StaticJsonCatalog
  configurator/       3D-UI: components/, composables/useConfigurator.ts, events.ts, types/, styles/
  scorm/              адаптер SCORM: scorm2004.ts (API_1484_11), runtime.ts, lessons.ts, tracker.ts, lesson.ts
  pages/              CatalogPage, LessonPage, CourseProgressPanel
public/               models/, tmh-previews/ (копируются в dist как есть)
scripts/              catalog.mjs (+ .d.mts), vite-plugin-lessons.ts, package-scorm.mjs
tests/                Playwright: scorm.spec.ts + fakeLms.ts
playwright.config.ts  один воркер: программный WebGL в headless Chromium тяжёлый
```

`scripts/catalog.mjs` — обычный JS без типов, потому что его импортируют и
`vite.config.ts` (через esbuild), и `package-scorm.mjs` (через чистый Node 22).
Типы для TS — в `scripts/catalog.d.mts`. Node запускает `.mjs` сам, без
`--experimental-strip-types`.

## Приложение НЕ создаёт собственный iframe

Это главное архитектурное ограничение. Раньше библиотека монтировала весь UI внутрь `<iframe>` с инъекцией строкой собранных стилей — отсюда трёхуровневая вложенность (LMS → SCO → iframe), 400-мс polling и опознавание заданий по тексту `.card-name`. Всё это удалено: UI рендерится прямо в документе SCO, CSS идёт обычным конвейером Vite.

Что из этого следует и легко ломается:

- SCORM-слой **не нюхает DOM**. Задания приходят из `useConfigurator` как семантические события (`model-loaded`, `part-selected`, `animation-played`). Добавляешь новый UI-элемент — пробрасывай событие, а не класс в разметке.
- Пути к моделям/текстурам/превью — относительные, от `document.baseURI`. Обращения к `window.parent.location.href` запрещены: в LMS родитель — страница системы, кросс-домен.
- Поиск `API_1484_11` вверх по цепочке родительских окон — **требование SCORM**, а не костыль. Обрыв на кросс-домене — ожидаемое поведение.
- Навигация «каталог ↔ урок» идёт через `history.pushState` (`src/scorm/lesson.ts`). Перезагрузка документа = второй `Initialize` в одной сессии LMS.
- Панель заданий в каталоге — **колонка в потоке** (`.app--catalog` — grid `1fr 332px`), а не накладка: `position: fixed` перекрывал вкладки категорий и карточки, и они становились некликабельными. На уроке панель остаётся поверх сцены и свёрнута (`CourseProgressPanel` реагирует на `onRouteChange`).

## API: каталог и обучение подключаются интерфейсами

`src/api/types.ts` — единственное место, где описано, что приложение ждёт от внешнего мира:

- `ModelCatalogSource.load()` — откуда берётся галерея. Сейчас `StaticJsonCatalog` читает `src/catalog/models.json`; подключение манифеста SCORM или API сервера = новая реализация, компоненты не меняются.
- `LearningRuntime` — как учимся. `Scorm2004Runtime` (LMS) и `LocalRuntime` (dev/превью, прогресс в `localStorage`). Компоненты не знают, есть ли LMS.

Сборка зависимостей — в одном месте: `src/main.ts` → `createConfiguratorApp({ catalog, runtime, lessonId })`. Никаких `window.init()` / `window.mount()`, разнесённых по времени и файлам.

Зона ответственности SCO определяется при запуске (`currentScope()`): SCO, открытый как `lesson-<id>.html`, отвечает за один урок; SCO, открытый как каталог (в т.ч. `?lesson=` из `<parameters>`) — за весь курс.

`Scorm2004Runtime` выбирается **по нахождению `API_1484_11`**, а не по успешности `Initialize`: молча переключаться на `LocalRuntime` внутри LMS нельзя — прогресс ушёл бы в `localStorage` мимо журнала. Если `Initialize` не удался, `inLms` остаётся `false` и запись в LMS отбрасывается, но интерфейс прежний. `Initialize` зовёт только `start()` — вызов из конструктора дал бы второй `Initialize` и нарушил SCORM.

## Задания курса — данные, а не хардкод

`src/scorm/lessons.ts`: три задания на урок (`open`, `part`, `animation`), у каждого — событие-источник, признак обязательности и условие применимости. Оценка и `cmi.interactions` собираются чистыми функциями отсюда же, без Vue и без SCORM. Анимация засчитывается только если она реально есть в модели — это выясняется из загруженной сцены, а не из флага в каталоге. `PASS_PERCENT = 67`.

Правила подсчёта и адреса уроков — в `SCORM-README.md`.

## Каталог моделей

`src/catalog/models.json` — единственный источник. Урок = запись с непустым `path` (сейчас 8: ЭП20, ТЭМ23, Москва-2020, ЭД4М, Иволга 3.0 + детали Редуктор/СА-3/Тележка). Остальные — заглушки без `path`, они в уроки не попадают. Пути **относительные** (`models/...`, `tmh-previews/...`) — без ведущего `/`. Новые 3D-модели клади в `public/models/`: они подхватятся и в сборку, и в манифест (упаковщик перечисляет файлы по факту), и в уроки (`readLessons`). Скрипт `fetch-tmh-previews.mjs`, качавший превью заглушек, удалён вместе с библиотекой — превью лежат в репозитории.

## Команды

Windows-кнут: `npm.ps1` заблокирован политикой выполнения — используй `npm.cmd`. `npx` — только как `npx.cmd`.

```powershell
npm.cmd install               # зависимости (один раз)
npm.cmd run dev               # Vite dev-сервер
npm.cmd run build             # vue-tsc --noEmit + vite build → dist/
npm.cmd run build:scorm       # build + package-scorm.mjs (режим params)
npm.cmd run build:scorm:files # build + package-scorm.mjs --lessons=files
npm.cmd test                  # Playwright: гоняет dist/, сам запускает webServer
npm.cmd run typecheck         # vue-tsc --noEmit
```

`npm.cmd test` поднимает `vite preview` сам и собирает проект (webServer), отдельно ничего запускать не надо.

Предпросмотр вручную: `npm.cmd run preview`, либо `python -m http.server 5000` со всего корня + `/scorm-test/lms-simulator.html` (ручной симулятор LMS с логом `cmi.*`).

## Генерация HTML-точек входа

`scripts/vite-plugin-lessons.ts` после сборки читает уже собранный `dist/index.html`, вытаскивает из него теги со ссылками на бандл и пишет по файлу `lesson-<id>.html` на каждый урок (с `window.__LESSON__ = {"id":"…"}`). Перечень уроков — `scripts/catalog.mjs` (`readLessons`), общий для плагина и упаковщика. Файлы генерируются всегда, даже в режиме `params`: они бесплатны и нужны для проверки прямой ссылки на урок.

## Упаковка SCORM (`scripts/package-scorm.mjs`)

- ZIP только через **Python `zipfile`**. `Compress-Archive` / `.NET ZipFile` кладут записи с обратными слэшами — LMS на Linux не импортирует. Не менять.
- `imsmanifest.xml` генерится из всех файлов dist; руками не править.
- Режимы: `--lessons=params` (дефолт: один `<resource>`, у каждого `<item>` свой `<parameters>?lesson=<id>`) и `--lessons=files` (отдельный SCO и href на урок). Приложение одинаково работает в обоих. Разница только в импорте: если уроки открывают каталог — LMS не поддерживает `<parameters>`, пересобери с `--lessons=files`.
- `scorm-package/` и `*.zip` в gitignore: артефакты не коммитим, только исходники (итоговый файл — `configurator-web-scorm2004.zip` в корне).

## Тесты

`tests/scorm.spec.ts` (Playwright, единственный автотест; старый jsdom `smoke-test.cjs` удалён вместе с внутренним iframe). `tests/fakeLms.ts` подставляет фейковый `API_1484_11` в родительское окно и открывает SCO во вложенном iframe — как в настоящей LMS. Проверяются: `Initialize` ровно один раз, отсутствие вложенного iframe (`page.frames().length === 2`), прямые адреса уроков, навигация без перезагрузки (сверка `window.__docStamp`), запись в `suspend_data`, отправка `score`/`completion`/`interactions` + `Terminate`.

Тесты бьют по `dist/`, поэтому `npm.cmd run build` перед `npm.cmd test` не нужен — webServer делает это сам.

Две особенности, из-за которых тесты идут ~3 минуты:

- `workers: 1` и `timeout: 120_000`. Программный WebGL в headless Chromium нагружает машину, и параллельные воркеры на 30-секундном таймауте падали на ровном месте.
- Урок в тестах — `sa-3` (1,5 МБ). ЭП20 — это 29 МБ GLB, разбор которого блокирует поток отрисовки. Остальные семь уроков проверяются наличием своих `lesson-<id>.html`, без открытия 3D.

## CI и git

- `.github/workflows/ci.yml`: два job на каждом push/PR — `typecheck-and-build` (`npm ci` → `typecheck` → `build` → упаковка в обоих режимах) и `e2e` (Playwright). Jest, сборка библиотеки и покрытие кода больше не существуют.
- Не коммить `dist/`, `node_modules/`, `scorm-package/`, `*.zip`, `test-results/`, `playwright-report/`.

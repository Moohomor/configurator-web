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
npm.cmd run build:scorm   # build + упаковка SCORM
npm.cmd test                # Playwright, ~3 мин
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
- **Внутри LMS переходы «каталог ↔ урок» выключены** (`linksEnabled` в `App.vue` → `runtime.kind !== "scorm"`): карточки галереи и список уроков в панели становятся обычным текстом. Уроки открываются из меню курса. Вне LMS переходы работают — не сломай автономный режим, галерея обязана оставаться удобной без LMS.

## Уроки

Каждая модель с 3D — отдельный урок курса: пункт меню со своим `href` на `lesson-<id>.html`, своя SCO-сессия, своя оценка (0 %, 50 %, 100 %) и своя запись в журнале LMS. Плюс пункт «Каталог моделей» — обзор всего курса. `lesson-<id>.html` генерируются `scripts/vite-plugin-lessons.ts` после сборки из уже собранного `index.html`.

**Никаких переходов между документами внутри SCO.** `navigate()` не имеет права менять `window.location.href`: смена документа внутри SCO-фрейма перезагружает приложение, новая загрузка зовёт Initialize второй раз в одной сессии, HCM после этого считает попытку закрытой и уроки перестают открываться. На попытку сменить документ там стоит `console.warn`. Отсюда:

- кнопки «к каталогу» в уроке нет (`LessonPage`, `ConfigSidebar.backLabel` пустым);
- **внутри LMS** карточки галереи и список уроков в панели — обычный текст (`linksEnabled` в `App.vue` → `runtime.kind !== "scorm"`);
- вне LMS переходы работают — не сломай автономный режим, `?lesson=<id>` на `index.html` тоже остаётся.

Навигация между уроками — меню курса.

Упаковка (`scripts/package-scorm.mjs`) — одна структура, флагов нет: каталог + отдельный `<resource>` на каждый урок. Режим `--lessons=params` (один SCO, урок через `<parameters>`) удалён: на HCM он не работает — импорт проходит, а все уроки молча открывают каталог.

- **ZIP только через Python `zipfile`.** `Compress-Archive` и `.NET ZipFile` пишут записи с обратными слэшами — LMS на Linux такой пакет не импортирует. Не менять.
- `imsmanifest.xml` генерируется из содержимого `dist`, руками не править.

## Задания и оценка

`src/scorm/lessons.ts`: три задания на урок (`open`, `part`, `animation`) — событие-источник, обязательность, условие применимости. Оценка и `cmi.interactions` собираются чистыми функциями оттуда же, без Vue и без SCORM. Анимация засчитывается, только если она реально есть в модели: это выясняется из загруженной сцены (`model-loaded` несёт `hasAnimations`), а не из флага в каталоге. `PASS_PERCENT = 67`.

**В знаменатель оценки входят только обязательные задания** (2 на урок). Анимация засчитывается не у всех моделей, и с ней знаменатель прыгал бы 16 → 17 → 18 по мере просмотра моделей: правая часть дроби обязана быть постоянной, иначе прогресс в LMS не отслеживается. Бонус виден в панели отдельно.

**Оценка уходит в LMS на каждое выполненное задание** (`LearningRuntime.report()`), а не по кнопке: кнопки «Завершить» в UI нет вообще, сессию закрывает уход со страницы. Ручная кнопка была вредной — `finish()` ставит Terminate и выставляет `reported`, после чего `mark()` перестаёт принимать события, то есть задания после нажатия в отчёт не попадали.

**Границы оценки объявляются в `start()`, сразу после Initialize** (`cmi.score.min/max` + `completion_status` + Commit). HCM читает границы один раз — при первом обращении к score; мы узнаём оценку только после первого задания, и к тому моменту LMS уже решила, что максимум равен нулю.

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
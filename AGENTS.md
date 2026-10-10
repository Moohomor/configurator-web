# AGENTS.md

Vue 3 + three.js, упаковано в SCORM 2004 (4th Edition) для WebSoft HCM.
Подробности SCORM — `SCORM-README.md`, пользовательские инструкции — `README.md`.

## Команды

Windows-кнут: `npm.ps1` заблокирован политикой выполнения → `npm.cmd`. `npx` → `npx.cmd`.

```powershell
npm.cmd install        # один раз
npm.cmd run dev        # 5173
npm.cmd run typecheck  # vue-tsc --noEmit
npm.cmd run build      # уже включает typecheck — отдельно звать не надо
npm.cmd run preview
npm.cmd run build:scorm   # build + упаковка SCORM
npm.cmd run build:embed   # build + контент-пакет для чужого курса
npm.cmd test                # Playwright, ~3 мин
```

Линтера и форматтера в проекте нет — не выдумывай конфиг, не запускай `eslint`/`prettier`.

Один тест: `npx.cmd playwright test -g "Initialize"`. Перед `npm.cmd test` собирать
не нужно: `webServer` в `playwright.config.ts` сам выполняет `npm run build` и
поднимает `vite preview` на 5184 (`--strictPort` — порт должен быть свободен,
иначе упадёт невнятно).

Ручная имитация LMS: `python -m http.server 5000` из корня →
`/scorm-test/lms-simulator.html`. Переключатель SCO подтягивает уроки из
`src/catalog/models.json`, лог `cmi.*` виден внизу.

## Структура

Одно приложение в корне. Раньше было два пакета через `file:`-связку, из-за чего
порядок сборки был обязателен.

```
index.html + lesson-<id>.html   HTML-точки входа: каталог и по одной на урок
src/main.ts   composition root: catalog + runtime + lessonId → mount()
src/api/      КОНТРАКТЫ: types.ts (ModelCatalogSource, LearningRuntime) + сборка зависимостей
src/catalog/  models.json — единственный источник каталога; ModelSelector, StaticJsonCatalog
src/configurator/  3D-UI: components/, useConfigurator.ts, events.ts, types/, styles/global.css
src/scorm/    адаптер LMS: scorm2004.ts, runtime.ts, lessons.ts, tracker.ts, lesson.ts
src/pages/    CatalogPage, LessonPage, CourseProgressPanel
src/app/App.vue  корневой каркас: решает «каталог или урок», включает linksEnabled
scripts/      catalog.mjs (+ .d.mts), vite-plugin-lessons.ts, package-scorm.mjs
tests/        Playwright: scorm.spec.ts + fakeLms.ts
public/       models/, tmh-previews/ — копируются в dist как есть
```

- **three.js грузится только на уроке:** `ModelViewer` подключён через
  `defineAsyncComponent` (`LessonPage.vue`) и уезжает в отдельный чанк. Каталог
  ~150 КБ, урок добавляет ~610 КБ. three.js в чанке каталога = сломана ленивая
  загрузка.
- **`scripts/catalog.mjs` — обычный JS без типов:** его импортируют и
  `vite.config.ts` (через esbuild), и `package-scorm.mjs` (чистый Node). Типы
  для TS — в `scripts/catalog.d.mts`. Превратишь в `.ts` — упаковщик начнёт
  требовать `--experimental-strip-types`.

## Пять запретов, которые ломаются молча

**1. Приложение не создаёт свой `<iframe>`.** UI рендерится прямо в документе
SCO, CSS идёт обычным конвейером Vite. Отсюда: SCORM-слой **не нюхает DOM** —
задания приходят из `useConfigurator` как семантические события
(`model-loaded`, `part-selected`, `animation-played`); пути к моделям и
текстурам относительные, от `document.baseURI`, в `vite.config.ts` — `base: "./"`;
поиск `API_1484_11` вверх по родительским окнам обязателен (обрыв на
кросс-домене — ожидаемое поведение, не ошибка).

**2. Внутри SCO нельзя менять документ.** Каталог лежит в `index.html`, а урок —
в `lesson-<id>.html`; переход между ними перезагружает документ в SCO-фрейме,
новая загрузка зовёт `Initialize` второй раз в одной сессии. Для SCORM это
нарушение протокола: HCM считает попытку закрытой и уроки перестают
открываться. `navigate()` поэтому не имеет права трогать
`window.location.href`, на попытку стоит `console.warn`. Отсюда: кнопок «к
каталогу» в уроке нет, а переходы «каталог ↔ урок» внутри одного документа —
`history.pushState` без перезагрузки.

**3. `Terminate` нельзя вешать на `visibilitychange`.** Документ SCO уходит в
фон при alt-tab, клике на окно LMS и открытии соседней вкладки; закрытая там
сессия отклоняет все последующие `SetValue`, и прогресс теряется. Сессия
закрывается на `pagehide` / `beforeunload`.

**4. Внутри LMS каталог не ведёт в уроки.** Уроки открываются из меню курса, а
кажущаяся возможность уйти в урок из галереи только сбивает с толку. Карточки
и список уроков в панели становятся обычным текстом — флаг `linksEnabled` в
`App.vue` (`runtime.kind !== "scorm"`). **Вне LMS переходы работают, не сломай
автономный режим:** без LMS галерея должна оставаться удобной.

**5. Контент для стороннего курса не инициализирует чужую сессию.**
`embed-<id>.html` и файлы из `content-package/` (с вшитым
`window.__CONTENT_EMBED__`) встраиваются iframe'ом в уроки чужого SCORM-курса.
Там нельзя искать `API_1484_11` и вызывать `Initialize`: API, который
найден, — это чужая SCO-сессия, наш Initialize сверху её ломает (второй
Initialize в одной сессии LMS считает попытку закрытой, но уже в чужом
курсе). `embedMode()` в `src/scorm/lesson.ts` выбирается только по явным
признакам — `window.__VIEWER__`, `window.__CONTENT_EMBED__`, `?embed=` —
**никогда** по наличию API, и поднимает `EmbedRuntime` (`src/scorm/runtime.ts`):
никаких Initialize/Terminate/SetValue, прогресс в отдельном ключе
`localStorage` (`configurator:embed-progress`, у лёгкого вьюера — свой,
`configurator:embed-viewer-progress`). Встраивать в чужой курс —
только файлы контент-zip; упаковщик вшивает флаг в файл, чтобы его нельзя
было забыть.

Ключи разные намеренно: вьюер работает «картинкой», панели заданий у него
нет, но трекер всё равно живёт и отмечает загрузку модели и выбор детали. На
общем ключе эти невидимые отметки потом всплыли бы в полном
`lesson-<id>.html` как «уже выполненные задания» — обучающий открыл бы урок
сразу готовым.

## Уроки и упаковка

Каждая модель с 3D — отдельный урок: пункт меню со своим `href` на
`lesson-<id>.html`, своя SCO-сессия, своя оценка (0 / 50 / 100 %) и своя запись
в журнале LMS. Плюс пункт «Каталог моделей» — обзор курса и общий прогресс.
`lesson-<id>.html` генерирует `scripts/vite-plugin-lessons.ts` после сборки из
уже собранного `index.html`; там же генерируется `embed-<id>.html` — лёгкий
вьюер для вставки в сторонний курс (`window.__VIEWER__`: скрыты шапка урока и
панель заданий).

Упаковщик (`scripts/package-scorm.mjs`) в режиме `scorm`: один `<resource>` на
пункт меню. Вариант с одним SCO на весь курс и `<parameters>?lesson=<id>` удалён —
HCM `<parameters>` игнорирует, импорт проходит, а все уроки молча открывают
каталог. Отдельный режим упаковки `embed` (`npm run build:embed`,
`node scripts/package-scorm.mjs embed`) собирает второй дистрибутив для
встраивания в чужие курсы: `content-package/` + `configurator-content.zip` —
тот же `dist` без манифеста, с вшитым `window.__CONTENT_EMBED__` в каждую
HTML-точку входа (см. запрет 5). Режимы независимы (`scorm` по умолчанию,
`all` — оба), оба читают один и тот же `dist`: отдельный Vite-конвейер ради
embed-страниц размножал бы точки истины, а HTML-точки входа плагин и так
генерирует при каждой сборке.

- **ZIP только через Python `zipfile`.** `Compress-Archive` и `.NET ZipFile`
  пишут записи с обратными слэшами — LMS на Linux такой пакет не импортирует.
- `imsmanifest.xml` генерируется из содержимого `dist`, руками не править.

## Оценка и прогресс

`src/scorm/lessons.ts`: три задания на урок (`open`, `part`, `animation`) —
событие-источник, обязательность, условие применимости. Оценка и
`cmi.interactions` собираются чистыми функциями оттуда же, без Vue и без SCORM.
`PASS_PERCENT = 67`.

- **Знаменатель — только обязательные задания** (2 на урок). Анимация есть не у
  всех моделей, и с ней знаменатель прыгал бы 16 → 17 → 18 по мере просмотра
  моделей; правая часть дроби обязана быть постоянной, иначе прогресс не
  отслеживается. Бонус виден в панели отдельно.
- **Результат уходит в LMS на каждое выполненное задание** (`report()`), а не по
  кнопке. Кнопки «Завершить» в UI нет: она ставила `Terminate` посреди работы
  и замораживала учёт — задания после нажатия в отчёт не попадали.
- **Границы оценки объявляются в `start()`, сразу после Initialize**
  (`score.min`, `score.max`, `completion_status` + Commit), и `min`/`max` пишутся
  **до** `raw`. HCM читает границы один раз — при первом обращении к score; если
  они появятся лишь после первого задания, максимум останется 0.
- **Анимация** засчитывается, только если реально есть в модели: это выясняется
  из загруженной сцены (`model-loaded` несёт `hasAnimations`), а не из флага в
  каталоге.
- `Scorm2004Runtime` выбирается **по нахождению `API_1484_11`**, а не по
  успешности `Initialize`: молчаливый переход на `LocalRuntime` внутри LMS увёл
  бы прогресс в `localStorage` мимо журнала. Если `Initialize` не удался,
  `inLms` остаётся `false` и запись в LMS отбрасывается — интерфейс прежний.
  `Initialize` зовёт только `start()`: вызов из конструктора дал бы второй
  `Initialize`.

## Каталог моделей

`src/catalog/models.json` — единственный источник. Урок = запись с непустым
`path` (сейчас 8). Остальные — заглушки без `path`, в уроки не попадают;
`?lesson=` на такую запись молча открывает каталог.

Новая модель: GLB кладём в `public/models/<имя>/`, запись добавляем в
`models.json` с непустым `path`. Она автоматически попадёт и в сборку, и в
манифест, и в уроки (`readLessons`), и получит свой `lesson-<id>.html`.
**Имя файла — ASCII:** кириллица ломает импорт на Linux-LMS (модель редуктора
поэтому `models/reductor/reductor.glb`).

## Тесты

`tests/scorm.spec.ts` — единственный автотест, 16 тестов. `tests/fakeLms.ts`
подставляет фейковый `API_1484_11` в родительское окно и открывает SCO во
вложенном iframe, как в настоящей LMS. Покрыто: отсутствие вложенного iframe
(`page.frames().length === 2`), ровно один `Initialize`, прямые адреса всех 8
уроков (урок и embed-страница), отсутствие кнопок «к каталогу» и «Завершить»,
неразрывность прогресса при переключении вкладки, `suspend_data`,
`score`/`completion`/`interactions`, единственный `Terminate` при уходе со
страницы, автономный режим, встраивание (`embed-<id>.html` и `?embed=1`):
ноль `Initialize`/`SetValue` при наличии API у родителя, скрытие chrome у
вьюера, прогресс в `configurator:embed-progress` (у вьюера — свой ключ, и
общий остаётся пустым).

Почему тесты идут ~3 минуты — не чини, это не тормоз:

- `workers: 1` и `timeout: 120_000`: программный WebGL в headless Chromium грузит
  машину, на параллельных воркерах тесты падали на ровном месте.
- Урок в тестах — `sa-3` (1,5 МБ). ЭП20 — 29 МБ GLB, разбор которого блокирует
  поток отрисовки и срывает таймауты; остальные семь уроков проверяются
  наличием своих `lesson-<id>.html`, без открытия 3D.

## CI и git

`.github/workflows/ci.yml`: два job на каждом push/PR — `typecheck-and-build`
(`npm ci` → typecheck → build → упаковка SCORM и контент-пакета) и `e2e`
(Playwright). Jest, сборка библиотеки и покрытие кода больше не существуют.

Не коммитить: `dist/`, `node_modules/`, `scorm-package/`, `content-package/`,
`*.zip`, `test-results/`, `playwright-report/`.
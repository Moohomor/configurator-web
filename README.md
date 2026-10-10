# 3D-конфигуратор подвижного состава

Vue 3 + three.js. Каталог из 56 моделей подвижного состава, 8 из них — с
настоящей 3D-моделью: их можно крутить, выбирать детали, менять текстуры,
освещение и смотреть анимацию. Каждая такая модель — отдельный урок курса,
упакованного в SCORM 2004 (4th Edition).

Описание SCORM-части — в [SCORM-README.md](SCORM-README.md),
архитектурные соглашения — в [AGENTS.md](AGENTS.md).

## Требования

- Node.js 20+
- npm 10+
- Python 3 (только для создания ZIP-архива пакета)

## Установка

```bash
npm install
```

## Запуск в разработке

```bash
npm run dev
```

- каталог: <http://localhost:5173/>
- конкретный урок: <http://localhost:5173/?lesson=loco-ep20>
- режим вставки (без SCORM, как в стороннем курсе):
  <http://localhost:5173/?lesson=loco-ep20&embed=viewer>

Вне LMS панель заданий пишет «Конфигуратор запущен вне LMS», прогресс
сохраняется в `localStorage`.

## Production-сборка

```bash
npm run build
npm run preview
```

`dist/` можно раздать любым статическим сервером:
`python -m http.server 3000 -d dist`.

### SCORM-пакет

```bash
npm run build:scorm   # приложение + SCORM-пакет
```

На выходе `scorm-package/` (распакованный курс) и
`configurator-web-scorm2004.zip` для загрузки в LMS. В меню курса отдельный
пункт на каждый урок со своим `href`, своей оценкой и своей записью в журнале.

## Встраивание в сторонний SCORM-курс

Помимо собственного курса приложение умеет работать материалом внутри
чужого курса: как обычная картинка посреди текста или как полноценный
урок. Это отдельный режим сборки:

```bash
npm run build:embed   # приложение + контент-zip для чужого курса
```

На выходе `content-package/` и `configurator-content.zip`: тот же `dist`
**без** `imsmanifest.xml`, в каждую HTML-точку входа вшит флаг
`window.__CONTENT_EMBED__`. Режимы независимы: `build:scorm` курс не трогает,
`build:embed` его не собирает; оба сразу — `node scripts/package-scorm.mjs all`.

### Куда класть файлы

Архив распаковывают в материалы (контент) стороннего курса — в любую
папку, откуда LMS раздаёт статику. Все пути внутри приложения
относительные, поэтому важен только адрес самой страницы, которую
вставляют iframe'ом; подкаталог и имя каталога могут быть любыми.

### Вставка модели посреди текста (лёгкий вьюер)

`embed-<id>.html` — сцена с панелью конфигуратора (текстуры, свет,
анимации, информация о модели), но без шапки урока и без панели заданий:

```html
<iframe
  src="materials/configurator/embed-sa-3.html"
  title="СА-3, 3D-модель"
  width="100%"
  height="600"
  style="border: 0"
  loading="lazy"
  allowfullscreen
></iframe>
```

### Вставка полного урока

`lesson-<id>.html` — тот же урок, что и в собственном курсе: шапка,
панель заданий и прогресс:

```html
<iframe
  src="materials/configurator/lesson-sa-3.html"
  title="Урок: СА-3"
  width="100%"
  height="800"
  style="border: 0"
  loading="lazy"
  allowfullscreen
></iframe>
```

Высота ориентировочная: вьюеру достаточно 400–600 px, уроку с панелью
заданий — 700–900 px.

### Как это работает и что нельзя делать

- **Ни одна вставляемая страница не трогает SCORM API чужого курса.**
  Она не ищет `API_1484_11` и не вызывает `Initialize`: флаг
  `__CONTENT_EMBED__` вшит прямо в файл контент-zip, поэтому его нельзя
  забыть. Прогресс заданий хранится в `localStorage` браузера
  (ключ `configurator:embed-progress`) и в LMS чужого курса не
  передаётся — оценку за вставку LMS не поставит. У лёгкого вьюера свой
  ключ (`configurator:embed-viewer-progress`), чтобы его невидимые отметки
  не вылезли потом в полном `lesson-<id>.html` как выполненные задания.
- **Встраивать файлы только из `configurator-content.zip`.** Страницы
  `lesson-<id>.html` из обычного SCORM-пакета рассчитаны на собственную
  SCO-сессию: внутри чужого курса они нашли бы API и открыли сессию
  второй раз, а LMS после этого считает попытку закрытой — сломается
  чужой курс. Если файлы пришлось взять из SCORM-пакета, допишите
  параметр `?embed=1` к адресу страницы — это аварийный эквивалент
  флага.
- Список всех моделей с готовыми адресами: `dist/embed-<id>.html` и
  `dist/lesson-<id>.html`, где `<id>` — из `src/catalog/models.json`.

Посмотреть вставку локально (после `npm run build`):

```bash
npm run preview
# http://127.0.0.1:4173/embed-sa-3.html — лёгкий вьюер
# http://127.0.0.1:4173/lesson-sa-3.html?embed=1 — полный урок без SCORM
```

## Тестирование

Playwright, e2e по собранному `dist/`: SCO открывается во вложенном iframe,
рядом подставляется фейковый SCORM Run-Time API.

```bash
npm test                    # само поднимет сборку и preview-сервер
npm run typecheck           # vue-tsc --noEmit
```

## Структура

```
index.html          единственная HTML-точка входа
src/
  main.ts           entry: catalog + runtime + lessonId → mount
  api/              контракты ModelCatalogSource и LearningRuntime, composition root
  catalog/          models.json (источник каталога), ModelSelector, StaticJsonCatalog
  configurator/     3D-UI: компоненты, useConfigurator, события
  scorm/            адаптер SCORM 2004, трекер, правила оценивания
  pages/            каталог, урок, панель заданий
public/models/      3D-модели и текстуры
scripts/            сборка HTML-точек входа и упаковка SCORM
tests/              Playwright
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) на каждом push и pull request:

1. `npm ci` → `npm run typecheck` → `npm run build`
2. упаковка SCORM-пакета и контент-zip для сторонних курсов
3. Playwright-тесты (Chromium)
4. артефакты сборки и отчёт тестов

## Troubleshooting

### `module not found` / не собирается

```bash
rm -rf node_modules package-lock.json
npm install
```

### Модели не грузятся, 404 на `models/...`

Пути в `src/catalog/models.json` должны быть **относительными** (`models/...`,
без ведущего `/`), а в `vite.config.ts` — `base: "./"`. Внутри LMS контент
раздаётся из произвольного подкаталога, абсолютные пути уводят в корень сервера.

### `EADDRINUSE`

```bash
npm run dev -- --port 5174
```

### После первого урока LMS пишет «курс закрыт»

Так ведёт себя второй `Initialize` в одной SCO-сессии — LMS считает попытку
закрытой. Причина обычно в переходе между документами внутри SCO (например,
по кнопке «в каталог»): каталог лежит в другом HTML-файле, и переход к нему
перезагружает документ в SCO-фрейме. Внутри урока таких переходов быть не
должно — навигация через меню курса.

### ZIP не создался

Архив собирается Python `zipfile`. Если Python не в PATH — создайте вручную:

```bash
Compress-Archive -Path scorm-package\* -DestinationPath configurator-web-scorm2004.zip
```

⚠️ Не заливайте такой архив в LMS: PowerShell пишет в записи обратные слэши,
и импорт на Linux падает.

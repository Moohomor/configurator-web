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
npm run build:scorm         # один SCO, уроки через <parameters> (по умолчанию)
npm run build:scorm:files   # отдельный SCO и href на каждый урок
```

На выходе `scorm-package/` (распакованный курс) и
`configurator-web-scorm2004.zip` для загрузки в LMS.

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
2. упаковка SCORM в обоих режимах
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

### Урок в LMS открывает каталог вместо нужной модели

LMS не поддерживает `<parameters>` из манифеста. Пересоберите пакет с
`npm run build:scorm:files` — тогда у каждого урока свой `href`.

### ZIP не создался

Архив собирается Python `zipfile`. Если Python не в PATH — создайте вручную:

```bash
Compress-Archive -Path scorm-package\* -DestinationPath configurator-web-scorm2004.zip
```

⚠️ Не заливайте такой архив в LMS: PowerShell пишет в записи обратные слэши,
и импорт на Linux падает.

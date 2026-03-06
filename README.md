# 3D конфигуратор поездов

Монорепо состоит из двух частей:
- `configurator-main` - библиотека `@univer/configurator`
- `example-main` - пример приложения, которое использует библиотеку

## Требования

- Node.js LTS (рекомендуется 20+)
- npm 10+

Проверка версий:

```bash
node -v
npm -v
```

## Установка и подготовка

Запускать из корня репозитория:

```bash
cd configurator-main
npm i
npm run build
cd ../example-main
npm i
```

## Запуск в режиме разработки

```bash
cd example-main
npm run dev
```

## Production-сборка

```bash
cd example-main
npm run build
npm run preview
```

Альтернатива: раздать папку `dist` через любой статический сервер (например, ```python -m http.server 3000 -d dist``` или ```npx --yes serve -s dist```).

## Тестирование

Проект использует Jest для модульного тестирования.

### Запуск тестов

```bash
cd configurator-main

# Запустить все тесты
npm test

# Запустить тесты в режиме наблюдения
npm run test:watch

# Сгенерировать отчет о покрытии
npm run test:coverage
```

### Покрытие тестами

Отчеты о покрытии генерируются в директории `configurator-main/coverage/`.
Откройте `coverage/lcov-report/index.html` в браузере для просмотра HTML-отчета.

## CI/CD Pipeline

Проект использует GitHub Actions для непрерывной интеграции. Pipeline запускается автоматически при:
- Каждом push в ветки `main`, `master` или `develop`
- Любом pull request (независимо от целевой ветки)

### Что делает CI Pipeline

1. **Тестирование**: Запускает все модульные тесты с генерацией покрытия
2. **Проверка типов**: Валидирует TypeScript типы в библиотеке
3. **Сборка**: Собирает библиотеку и пример приложения
4. **Артефакты**: Сохраняет результаты сборки на 7 дней

### Статус CI

Проверьте [вкладку Actions](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions) для просмотра статуса последних запусков CI.

## Troubleshooting

### 1) `module not found` / пакет не находится

Причина: зависимости не установлены в одной из папок.

Решение:

```bash
cd configurator-main
npm install
npm run build
cd ../example-main
npm install
```

### 2) Ошибка импорта `@univer/configurator`

Причина: библиотека не собрана.

Решение:

```bash
cd configurator-main
npm run build
```

### 3) Конфликты зависимостей после обновлений

Причина: поврежденный кэш/lock-файл/`node_modules`.

Решение:

```bash
npx --yes rimraf "configurator-main/node_modules" "configurator-main/package-lock.json" "example-main/node_modules" "example-main/package-lock.json"
cd configurator-main
npm install
cd ../example-main
npm install
```

### 4) `EADDRINUSE` (порт занят)

Причина: порт dev/preview уже используется.

Решение:

```bash
cd example-main
npm run dev -- --port 5174
```

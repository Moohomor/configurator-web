# 3D Конфигуратор поездов РЖД

Интерактивный конфигуратор для просмотра и настройки 3D моделей поездов.

## Возможности

- 🚂 Выбор из нескольких моделей поездов
- 🎨 Изменение цвета отдельных деталей (синий, зелёный, жёлтый)
- 🖱️ Интерактивное выделение деталей при клике (в 3D и из списка)
- 🔄 Вращение и масштабирование модели
- 📋 Список всех деталей модели с возможностью выбора
- 🎯 Применение цвета к выбранной детали

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

Откройте `http://localhost:5173` в браузере.

## Сборка

```bash
npm run build
```

Результат сборки будет в папке `dist/`.

## Использование как библиотеки

После сборки можно подключить конфигуратор на любую страницу:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Конфигуратор</title>
  </head>
  <body>
    <div id="configurator"></div>

    <!-- Подключение Vue -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>

    <!-- Подключение конфигуратора -->
    <script src="./dist/configurator.js"></script>

    <script>
      // Монтирование конфигуратора
      window.mountConfigurator("#configurator");
    </script>
  </body>
</html>
```

## API

### Загрузка моделей

Библиотека предоставляет API для работы с моделями:

```typescript
import { configuratorAPI } from "@univer/configurator";

// Загрузить модели
const models = await configuratorAPI.loadModels();

// Добавить новую модель
configuratorAPI.addModel({
  id: "new_train",
  name: "Новый поезд",
  path: "/models/train.gltf",
  preview: "/models/preview.png",
});

// Получить доступные цвета
const colors = configuratorAPI.getAvailableColors();
```

## Структура проекта

```
configurator/
├── src/
│   ├── api/              # API для работы с моделями
│   ├── app/              # Главный компонент приложения
│   ├── components/       # Vue компоненты
│   │   ├── ModelSelector.vue   # Выбор модели
│   │   ├── ModelViewer.vue     # 3D вьювер
│   │   └── ConfigSidebar.vue   # Боковая панель
│   ├── helpers/          # Вспомогательные функции
│   ├── styles/           # Глобальные стили
│   ├── types/            # TypeScript типы
│   └── main.ts           # Точка входа
├── rzd_train/            # 3D модель поезда РЖД
│   ├── scene.gltf
│   ├── scene.bin
│   └── textures/         # Текстуры (default, blue, green, yellow)
└── dist/                 # Скомпилированная библиотека
```

## Технологии

- **Vue 3** - фреймворк
- **Three.js** - 3D рендеринг
- **TypeScript** - типизация
- **Vite** - сборщик

## Работа с моделями

Модели должны быть в формате GLTF/GLB. Структура папки с моделью:

```
model_name/
├── scene.gltf          # Основной файл модели
├── scene.bin           # Бинарные данные
└── textures/           # Текстуры
    ├── default/        # Стандартные текстуры
    ├── blue/          # Синие текстуры
    ├── green/         # Зелёные текстуры
    └── yellow/        # Жёлтые текстуры
```

Текстуры должны иметь формат `{materialName}_baseColor.png`.

## Лицензия

См. файл LICENSE

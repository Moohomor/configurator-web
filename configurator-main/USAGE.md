# Использование 3D конфигуратора

## Быстрый старт

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Мой конфигуратор</title>
  </head>
  <body>
    <div id="configurator"></div>

    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    <script src="./dist/configurator.js"></script>

    <script>
      // ОБЯЗАТЕЛЬНО инициализируй конфигуратор ПЕРЕД монтированием
      window.configuratorAPI.init({
        models: [
          {
            id: "my_train",
            name: "Мой поезд",
            path: "/models/train.gltf",
          },
        ],
      });

      // Теперь монтируй
      window.mountConfigurator("#configurator");
    </script>
  </body>
</html>
```

## API

### window.configuratorAPI.init(config)

**ОБЯЗАТЕЛЬНО** вызвать перед `mountConfigurator()`!

```javascript
window.configuratorAPI.init({
  models: [
    {
      id: "train_1", // уникальный ID
      name: "Поезд 1", // название в UI
      path: "/models/1.gltf", // путь к GLTF файлу
      preview: "/preview.png", // опционально: превью
    },
  ],
  colors: [
    // опционально
    {
      name: "Красный",
      value: "red",
      texturePath: "/textures/red", // путь к папке с текстурами
    },
  ],
});
```

### window.mountConfigurator(selector)

Монтирует конфигуратор в указанный элемент.

```javascript
window.mountConfigurator("#configurator");
```

## Примеры

### С несколькими моделями

```javascript
window.configuratorAPI.init({
  models: [
    { id: "train_1", name: "Поезд РЖД", path: "/models/rzd.gltf" },
    { id: "train_2", name: "Метро", path: "/models/metro.gltf" },
    { id: "train_3", name: "Трамвай", path: "/models/tram.gltf" },
  ],
});
```

### С кастомными цветами

```javascript
window.configuratorAPI.init({
  models: [{ id: "train", name: "Поезд", path: "/models/train.gltf" }],
  colors: [
    { name: "Стандартный", value: "default", texturePath: "" },
    { name: "Синий", value: "blue", texturePath: "/textures/blue" },
    { name: "Красный", value: "red", texturePath: "/textures/red" },
  ],
});
```

### Загрузка моделей с сервера

```javascript
async function loadConfig() {
  const response = await fetch("/api/train-models");
  const models = await response.json();

  window.configuratorAPI.init({ models });
  window.mountConfigurator("#configurator");
}

loadConfig();
```

### Динамическое добавление моделей

```javascript
// Инициализация с одной моделью
window.configuratorAPI.init({
  models: [{ id: "train_1", name: "Поезд 1", path: "/models/1.gltf" }],
});

window.mountConfigurator("#configurator");

// Потом добавить еще
window.configuratorAPI.addModel({
  id: "train_2",
  name: "Поезд 2",
  path: "/models/2.gltf",
});
```

## Структура файлов

### Модель

```
public/
└── models/
    └── my_train/
        ├── scene.gltf       # основной файл
        ├── scene.bin        # бинарные данные
        └── textures/
            ├── default/     # стандартные текстуры
            │   ├── Material_001_baseColor.png
            │   └── Material_002_baseColor.png
            └── blue/        # синие текстуры
                ├── Material_001_baseColor.png
                └── Material_002_baseColor.png
```

### Путь в API

```javascript
window.configuratorAPI.init({
  models: [
    {
      id: "my_train",
      name: "Мой поезд",
      path: "/models/my_train/scene.gltf", // путь от корня проекта
    },
  ],
  colors: [
    {
      name: "Синий",
      value: "blue",
      texturePath: "/models/my_train/textures/blue", // путь к папке с текстурами
    },
  ],
});
```

## Важно

1. **Модели НЕ включены в плагин** - ты сам добавляешь их через API
2. **Пути относительно твоего проекта** - не плагина
3. **init() обязателен** - без него не будет моделей
4. **Формат GLTF/GLB** - другие форматы не поддерживаются
5. **Текстуры опционально** - если не нужны цвета, не указывай их

## API методы

```javascript
// Инициализация (ОБЯЗАТЕЛЬНО)
window.configuratorAPI.init({ models, colors });

// Работа с моделями
window.configuratorAPI.addModel(model);
window.configuratorAPI.addModels([model1, model2]);
window.configuratorAPI.setModels([models]);
window.configuratorAPI.clearModels();
window.configuratorAPI.getModels();
window.configuratorAPI.getModelById("id");

// Работа с цветами
window.configuratorAPI.addColor(color);
window.configuratorAPI.setColors([colors]);
window.configuratorAPI.getAvailableColors();

// Монтирование
window.mountConfigurator("#selector");
```


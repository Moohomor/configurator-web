import "@univer/configurator";
import "./styles.css";

window.configuratorAPI.init({
  models: [
    {
      id: "rzd_train",
      name: "Поезд РЖД",
      path: "/models/rzd_train/scene.gltf",
      texturePacks: [
        { id: "blue", name: "Синий", path: "/text/blue" },
        {
          id: "green",
          name: "Зелёный",
          path: "/text/green",
        },
        {
          id: "yellow",
          name: "Жёлтый",
          path: "/text/yellow",
        },
        {
          id: "red",
          name: "Красный",
          path: "/text/red",
        },
      ],
    },
  ],
});

window.mountConfigurator("#app");

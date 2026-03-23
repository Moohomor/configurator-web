const models = [
  {
    id: "ed4m_car",
    name: "Вагон ЭД4М",
    path: "/models/ed4m_car/scene.gltf",
    category: "electric-and-diesel-trains",
    texturePacks: [
      { id: "blue", name: "Синий", path: "/models/ed4m_car/text/blue" },
      { id: "red", name: "Красный", path: "/models/ed4m_car/text/red" },
    ],
  },
  {
    id: "reductor",
    name: "Редуктор",
    path: "/models/reductor/Редуктор_червячный_Ч_100_АНИМАЦИЯ_рабочий_вариант.glb",
    category: "special-cars",
    texturePacks: [],
  },
  {
    id: "sa-3",
    name: "Автосцепка СА-3",
    path: "/models/sa-3/scene.glb",
    category: "special-cars",
    texturePacks: [],
  },
];

export default models;

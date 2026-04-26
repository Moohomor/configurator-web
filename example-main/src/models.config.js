// Entries with `path` are real 3D models (available=true by default).
// Entries without `path` are placeholder cards mirroring tmholding.ru —
// rendered dimmed with a "Модель скоро появится" tooltip; not clickable.

const PLACEHOLDER_BASE = "/tmh-previews/";
const p = (name) => PLACEHOLDER_BASE + name;

const models = [
  // ========== Локомотивы ==========
  // --- Грузовые ---
  { id: "loco-3te28",        name: "Магистральный тепловоз 3ТЭ28",                     category: "locomotives", subcategory: "Грузовые",                 preview: p("loco-3te28.jpg"),        available: false },
  { id: "loco-3te25k2m",     name: "Тепловоз 3ТЭ25К2М",                                category: "locomotives", subcategory: "Грузовые",                 preview: p("loco-3te25k2m.jpg"),     available: false },
  { id: "loco-2te25km",      name: "Тепловоз 2ТЭ25КМ",                                 category: "locomotives", subcategory: "Грузовые",                 preview: p("loco-2te25km.jpg"),      available: false },
  { id: "loco-es5k-ermak",   name: "Электровозы переменного тока: 2(3,4)ЭС5К «Ермак»", category: "locomotives", subcategory: "Грузовые",                 preview: p("loco-es5k-ermak.jpg"),   available: false },
  { id: "loco-es4k-donchak", name: "Электровозы постоянного тока: 2(3)ЭС4К «Дончак»",  category: "locomotives", subcategory: "Грузовые",                 preview: p("loco-es4k-donchak.jpg"), available: false },
  { id: "loco-es5s",         name: "Электровозы переменного тока: 2(3)ЭС5С",           category: "locomotives", subcategory: "Грузовые",                 preview: p("loco-es5s.jpg"),         available: false },
  // --- Пассажирские ---
  { id: "loco-tep70bs",      name: "Тепловозы: ТЭП70БС",                               category: "locomotives", subcategory: "Пассажирские",             preview: p("loco-tep70bs.jpg"),      available: false },
  { id: "loco-ep2k",         name: "Электровозы постоянного тока: ЭП2К",               category: "locomotives", subcategory: "Пассажирские",             preview: p("loco-ep2k.jpg"),         available: false },
  { id: "loco-ep1mp",        name: "Электровоз переменного тока: ЭП1М/П",              category: "locomotives", subcategory: "Пассажирские",             preview: p("loco-ep1mp.jpg"),        available: false },
  { id: "loco-ep20",         name: "Мультисистемные: ЭП20",                            category: "locomotives", subcategory: "Пассажирские",             preview: p("loco-ep20.jpg"),         available: false },
  // --- Промышленные/маневровые ---
  { id: "loco-tem23",        name: "Маневровый тепловоз ТЭМ23",                        category: "locomotives", subcategory: "Промышленные/маневровые",  preview: p("loco-tem23.jpg"),        available: false },
  { id: "loco-emka2",        name: "Маневровый электровоз ЭМКА2",                      category: "locomotives", subcategory: "Промышленные/маневровые",  preview: p("loco-emka2.jpg"),        available: false },
  { id: "loco-tem18dm",      name: "Маневровый тепловоз ТЭМ18ДМ",                      category: "locomotives", subcategory: "Промышленные/маневровые",  preview: p("loco-tem18dm.jpg"),      available: false },
  { id: "loco-tem28",        name: "Маневровый тепловоз ТЭМ28",                        category: "locomotives", subcategory: "Промышленные/маневровые",  preview: p("loco-tem28.jpg"),        available: false },
  { id: "loco-npm2m",        name: "Промышленный электровоз НПМ2М",                    category: "locomotives", subcategory: "Промышленные/маневровые",  preview: p("loco-npm2m.jpg"),        available: false },
  { id: "loco-np1",          name: "Промышленный электровоз НП1",                      category: "locomotives", subcategory: "Промышленные/маневровые",  preview: p("loco-np1.jpg"),          available: false },

  // ========== Вагоны метро ==========
  // --- Ключевые проекты ---
  { id: "metro-moscow-2024",     name: "Москва-2024",       category: "metro-cars", subcategory: "Ключевые проекты", preview: p("metro-moscow-2024.jpg"),     available: false },
  { id: "metro-moscow-2020",     name: "Москва-2020",       category: "metro-cars", subcategory: "Ключевые проекты", preview: p("metro-moscow-2020.jpg"),     available: false },
  { id: "metro-moscow-765",      name: "Москва (765 вагон)",category: "metro-cars", subcategory: "Ключевые проекты", preview: p("metro-moscow-765.jpg"),      available: false },
  { id: "metro-baltiyets",       name: "Балтиец",           category: "metro-cars", subcategory: "Ключевые проекты", preview: p("metro-baltiyets.jpg"),       available: false },
  // --- Экспорт ---
  { id: "metro-minsk-2024",      name: "Минск-2024",        category: "metro-cars", subcategory: "Экспорт",          preview: p("metro-minsk-2024.jpg"),      available: false },
  { id: "metro-budapest",        name: "Будапешт",          category: "metro-cars", subcategory: "Экспорт",          preview: p("metro-budapest.jpg"),        available: false },
  { id: "metro-sofia",           name: "София",             category: "metro-cars", subcategory: "Экспорт",          preview: p("metro-sofia.jpg"),           available: false },
  { id: "metro-tashkent",        name: "Ташкент",           category: "metro-cars", subcategory: "Экспорт",          preview: p("metro-tashkent.jpg"),        available: false },
  { id: "metro-baku",            name: "Баку",              category: "metro-cars", subcategory: "Экспорт",          preview: p("metro-baku.jpg"),            available: false },
  // --- Спецпроекты ---
  { id: "metro-akvarel",         name: "Акварель",          category: "metro-cars", subcategory: "Спецпроекты",      preview: p("metro-akvarel.jpg"),         available: false },
  { id: "metro-krasnaya-strela", name: "Красная стрела",    category: "metro-cars", subcategory: "Спецпроекты",      preview: p("metro-krasnaya-strela.jpg"), available: false },
  { id: "metro-retropoezd",      name: "Ретропоезд",        category: "metro-cars", subcategory: "Спецпроекты",      preview: p("metro-retropoezd.jpg"),      available: false },

  // ========== Электропоезда и дизель-поезда ==========
  // --- Электропоезда ---
  {
    id: "ed4m_car",
    name: "Вагон ЭД4М",
    path: "/models/ed4m_car/scene.gltf",
    category: "electric-and-diesel-trains",
    subcategory: "Электропоезда",
    preview: "models/ed4m_car/preview.png",
    available: true,
    texturePacks: [
      { id: "blue", name: "Синий", path: "/models/ed4m_car/text/blue" },
      { id: "red",  name: "Красный", path: "/models/ed4m_car/text/red" },
    ],
  },
  { id: "train-ivolga-4",  name: "Иволга 4.0",  category: "electric-and-diesel-trains", subcategory: "Электропоезда", preview: p("train-ivolga-4.jpg"),   available: false },
  { id: "train-ivolga-3",  name: "Иволга 3.0",  category: "electric-and-diesel-trains", subcategory: "Электропоезда", preview: p("train-ivolga-3.jpg"),   available: false },
  { id: "train-ep2dm",     name: "ЭП2ДМ",       category: "electric-and-diesel-trains", subcategory: "Электропоезда", preview: p("train-ep2dm.jpg"),      available: false },
  { id: "train-ep2d-ep3d", name: "ЭП2Д/ЭП3Д",   category: "electric-and-diesel-trains", subcategory: "Электропоезда", preview: p("train-ep2d-ep3d.jpg"),  available: false },
  // --- Дизель-поезда ---
  { id: "train-orlan",     name: "Орлан",       category: "electric-and-diesel-trains", subcategory: "Дизель-поезда", preview: p("train-orlan.jpeg"),     available: false },

  // ========== Пассажирские вагоны ==========
  // --- Одноэтажные ---
  { id: "passwagon-61-4517", name: "Купейный вагон (двухвагонный сцеп) 61-4517",      category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4517.jpg"), available: false },
  { id: "passwagon-61-4516", name: "Некупейный вагон (двухвагонный сцеп) 61-4516",    category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4516.jpg"), available: false },
  { id: "passwagon-61-4529", name: "Купейный штабной вагон 61-4529",                  category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4529.jpg"), available: false },
  { id: "passwagon-61-4458", name: "Вагон с местами для сидения 61-4458",             category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4458.jpg"), available: false },
  { id: "passwagon-61-4460", name: "61-4460 вагон-ресторан",                          category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4460.jpg"), available: false },
  { id: "passwagon-61-4440", name: "Купейный вагон 61-4440",                          category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4440.jpg"), available: false },
  { id: "passwagon-61-4445", name: "Купейный штабной вагон 61-4445",                  category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4445.jpg"), available: false },
  { id: "passwagon-61-4447", name: "Некупейный вагон 61-4447",                        category: "passenger-cars", subcategory: "Одноэтажные", preview: p("passwagon-61-4447.jpg"), available: false },
  // --- Двухэтажные ---
  { id: "passwagon-61-4523", name: "Двухэтажный купейный вагон 61-4523",              category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4523.jpg"), available: false },
  { id: "passwagon-61-4524", name: "Двухэтажный купейный штабной вагон 61-4524",      category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4524.jpg"), available: false },
  { id: "passwagon-61-4525", name: "Двухэтажный вагон-бистро 61-4525",                category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4525.jpg"), available: false },
  { id: "passwagon-61-4492", name: "61-4492 двухэтажный вагон с местами для сидения", category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4492.jpg"), available: false },
  { id: "passwagon-61-4503", name: "61-4503 двухэтажный штабной вагон с местами для сидения", category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4503.jpg"), available: false },
  { id: "passwagon-61-4472", name: "Модель 61-4472 Купейный штабной вагон",           category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4472.jpg"), available: false },
  { id: "passwagon-61-4473", name: "Двухэтажный вагон-ресторан 61-4473",              category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4473.jpg"), available: false },
  { id: "passwagon-61-4465", name: "Двухэтажный купейный вагон 61-4465",              category: "passenger-cars", subcategory: "Двухэтажные", preview: p("passwagon-61-4465.jpg"), available: false },

  // ========== Специальные вагоны ==========
  { id: "special-baggage",       name: "Багажно-почтовые",      category: "special-cars", subcategory: "Специальные вагоны", preview: p("special-baggage.jpg"),       available: false },
  { id: "special-escort",        name: "Сопровождения",         category: "special-cars", subcategory: "Специальные вагоны", preview: p("special-escort.jpg"),        available: false },
  { id: "special-power-station", name: "Электростанция",        category: "special-cars", subcategory: "Специальные вагоны", preview: p("special-power-station.jpg"), available: false },

  // ========== Детали ==========
  {
    id: "reductor",
    name: "Редуктор",
    path: "/models/reductor/Редуктор_червячный_Ч_100_АНИМАЦИЯ_рабочий_вариант.glb",
    preview: "/models/reductor/preview.png",
    category: "parts",
    texturePacks: [],
  },
  {
    id: "sa-3",
    name: "Автосцепка СА-3",
    path: "/models/sa-3/scene.glb",
    preview: "/models/sa-3/preview.jpg",
    category: "parts",
    texturePacks: [],
  },
];

export default models;

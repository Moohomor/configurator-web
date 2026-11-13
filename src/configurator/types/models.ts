export type ModelCategory =
  | "locomotives"
  | "metro-cars"
  | "electric-and-diesel-trains"
  | "passenger-cars"
  | "special-cars"
  | "parts";

export interface Model {
  id: string;
  name: string;
  path?: string;
  category?: ModelCategory;
  subcategory?: string;
  preview?: string;
  texturePacks?: TexturePack[];
  available?: boolean;
  description?: string;
  year?: number;
  maxSpeed?: number;
  power?: number;
}

export interface TexturePack {
  id: string;
  name: string;
  path: string;
}

export interface ModelPart {
  /** Уникальный id узла сцены (Object3D.uuid): имена деталей могут повторяться. */
  id: string;
  name: string;
  materialName: string;
  mesh?: any;
  description?: string;
  metadata?: Record<string, any>;
  visible?: boolean;
}

/**
 * Узел иерархии модели — как в Outliner Blender: показываем все узлы файла
 * (группы, кости, меши) без фильтрации. Деталь (меш) связана с узлом по id.
 */
export interface PartNode {
  id: string;
  name: string;
  /** Меш — его можно выбрать на сцене; остальное — группы/кости/пустышки. */
  isMesh: boolean;
  children: PartNode[];
}

export interface ConfiguratorState {
  selectedModel: Model | null;
  selectedPart: ModelPart | null;
  parts: ModelPart[];
  selectedTexturePack: TexturePack | null;
}

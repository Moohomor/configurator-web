export interface Model {
  id: string;
  name: string;
  path: string;
  preview?: string;
  texturePacks?: TexturePack[]; // Текстур-паки для этой модели
}

export interface TexturePack {
  id: string;
  name: string;
  path: string; // Путь к папке с текстурами (например: "/textures/blue")
}

export interface ModelPart {
  name: string;
  materialName: string;
  mesh?: any; // THREE.Mesh
  description?: string; // Описание детали
  metadata?: Record<string, any>; // Дополнительные данные
  visible?: boolean; // Видимость детали
}

export interface ConfiguratorState {
  selectedModel: Model | null;
  selectedPart: ModelPart | null;
  parts: ModelPart[];
  selectedTexturePack: TexturePack | null;
}

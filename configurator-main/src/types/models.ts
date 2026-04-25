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
}

export interface TexturePack {
  id: string;
  name: string;
  path: string;
}

export interface ModelPart {
  name: string;
  materialName: string;
  mesh?: any;
  description?: string;
  metadata?: Record<string, any>;
  visible?: boolean;
}

export interface ConfiguratorState {
  selectedModel: Model | null;
  selectedPart: ModelPart | null;
  parts: ModelPart[];
  selectedTexturePack: TexturePack | null;
}

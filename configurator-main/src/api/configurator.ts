import type { Model, TexturePack } from "../types/models";

const MODEL_STORAGE_BASE_URL =
  "https://etogqnumnondirckzpcr.supabase.co/storage/v1/object/public/models";

function resolveModelStoragePath(path: string): string {
  if (path === "/models" || path === "models") {
    return MODEL_STORAGE_BASE_URL;
  }

  if (path.startsWith("/models/")) {
    return `${MODEL_STORAGE_BASE_URL}${path.slice("/models".length)}`;
  }

  if (path.startsWith("models/")) {
    return `${MODEL_STORAGE_BASE_URL}/${path.slice("models/".length)}`;
  }

  return path;
}

function normalizeTexturePack(texturePack: TexturePack): TexturePack {
  return {
    ...texturePack,
    path: resolveModelStoragePath(texturePack.path),
  };
}

function normalizeModel(model: Model): Model {
  return {
    ...model,
    path: model.path ? resolveModelStoragePath(model.path) : model.path,
    preview: model.preview ? resolveModelStoragePath(model.preview) : model.preview,
    texturePacks: model.texturePacks?.map(normalizeTexturePack),
  };
}

export class ConfiguratorAPI {
  private models: Model[] = [];

  /**
   * Загрузить список доступных моделей
   */
  async loadModels(): Promise<Model[]> {
    return this.models;
  }

  /**
   * Инициализировать конфигуратор с кастомными моделями
   * ОБЯЗАТЕЛЬНО вызывать ДО монтирования приложения
   */
  init(config: { models: Model[] }): void {
    this.models = config.models.map(normalizeModel);
  }

  /**
   * Получить список моделей
   */
  getModels(): Model[] {
    return this.models;
  }

  /**
   * Добавить новую модель в список
   */
  addModel(model: Model): void {
    this.models.push(normalizeModel(model));
  }

  /**
   * Добавить несколько моделей
   */
  addModels(models: Model[]): void {
    this.models.push(...models.map(normalizeModel));
  }

  /**
   * Добавить текстур-пак к модели
   */
  addTexturePackToModel(modelId: string, texturePack: TexturePack): void {
    const model = this.models.find((m) => m.id === modelId);
    if (model) {
      if (!model.texturePacks) {
        model.texturePacks = [];
      }
      model.texturePacks.push(normalizeTexturePack(texturePack));
    }
  }

  /**
   * Добавить несколько текстур-паков к модели
   */
  addTexturePacksToModel(modelId: string, texturePacks: TexturePack[]): void {
    const model = this.models.find((m) => m.id === modelId);
    if (model) {
      if (!model.texturePacks) {
        model.texturePacks = [];
      }
      model.texturePacks.push(...texturePacks.map(normalizeTexturePack));
    }
  }

  /**
   * Получить модель по ID
   */
  getModelById(id: string): Model | undefined {
    return this.models.find((m) => m.id === id);
  }

  /**
   * Очистить все модели
   */
  clearModels(): void {
    this.models = [];
  }

  /**
   * Заменить все модели
   */
  setModels(models: Model[]): void {
    this.models = models.map(normalizeModel);
  }
}

export const configuratorAPI = new ConfiguratorAPI();

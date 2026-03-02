import type { Model, TexturePack } from "../types/models";

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
    this.models = config.models;
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
    this.models.push(model);
  }

  /**
   * Добавить несколько моделей
   */
  addModels(models: Model[]): void {
    this.models.push(...models);
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
      model.texturePacks.push(texturePack);
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
      model.texturePacks.push(...texturePacks);
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
    this.models = models;
  }
}

export const configuratorAPI = new ConfiguratorAPI();

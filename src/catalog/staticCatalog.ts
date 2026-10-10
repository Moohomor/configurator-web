/* =====================================================================
 * catalog/staticCatalog.ts
 * Каталог из собранного с приложением models.json — реализация
 * ModelCatalogSource по умолчанию. Чтобы заменить источник (манифест
 * SCORM, API сервера, конфиг обучаемого), достаточно передать другую
 * реализацию в createConfiguratorApp.
 * ===================================================================== */
import records from "./models.json";
import type { Model } from "@/configurator/types/models";
import type { ModelCatalogSource } from "@/api/types";

export class StaticJsonCatalog implements ModelCatalogSource {
  async load(): Promise<Model[]> {
    return records as Model[];
  }
}

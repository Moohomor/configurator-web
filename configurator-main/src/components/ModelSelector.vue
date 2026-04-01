<template>
  <div class="configurator-model-selector">
    <h2>Выберите модель</h2>

    <div class="category-tabs" role="tablist" aria-label="Категории моделей">
      <button
        v-for="tab in categoryTabs"
        :key="tab.id"
        :id="`tab-${tab.id}`"
        type="button"
        role="tab"
        class="category-tab"
        :class="{ active: tab.id === activeCategory }"
        :aria-selected="tab.id === activeCategory"
        aria-controls="models-panel"
        @click="activeCategory = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="filteredModels.length"
      id="models-panel"
      class="models-grid"
      role="tabpanel"
      :aria-labelledby="`tab-${activeCategory}`"
    >
      <div
        v-for="model in filteredModels"
        :key="model.id"
        class="model-card"
        role="button"
        tabindex="0"
        :aria-label="`Выбрать модель ${model.name}`"
        @click="$emit('select', model)"
        @keydown.enter.prevent="$emit('select', model)"
        @keydown.space.prevent="$emit('select', model)"
      >
        <div class="model-preview">
          <img v-if="model.preview" :src="resolvePreviewUrl(model.preview)" :alt="model.name" />
          <div v-else class="preview-placeholder">🚂</div>
        </div>
        <h3>{{ model.name }}</h3>
      </div>
    </div>

    <p v-else class="empty-state">В этой вкладке пока нет моделей.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Model, ModelCategory } from "../types/models";

interface Props {
  models: Model[];
}

const props = defineProps<Props>();

defineEmits<{
  select: [model: Model];
}>();

const categoryTabs: Array<{ id: ModelCategory; label: string }> = [
  { id: "locomotives", label: "Локомотивы" },
  { id: "metro-cars", label: "Вагоны метро" },
  { id: "electric-and-diesel-trains", label: "Электропоезда и дизель-поезда" },
  { id: "passenger-cars", label: "Пассажирские вагоны" },
  { id: "special-cars", label: "Специальные вагоны" },
];

const activeCategory = ref<ModelCategory>("locomotives");

const filteredModels = computed(() =>
  props.models.filter((model) => {
    if (model.category) {
      return model.category === activeCategory.value;
    }

    return activeCategory.value === "special-cars";
  })
);

function resolvePreviewUrl(previewPath: string): string {
  if (
    previewPath.startsWith("http://") ||
    previewPath.startsWith("https://") ||
    previewPath.startsWith("data:") ||
    previewPath.startsWith("blob:")
  ) {
    return previewPath;
  }

  const baseUrl = window.parent?.location?.href || window.location.href;
  return new URL(previewPath, baseUrl).href;
}
</script>

<style>
.configurator-model-selector {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
}

.configurator-model-selector h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
}

.configurator-model-selector .category-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}

.configurator-model-selector .category-tab {
  border: 1px solid #d0d7de;
  background: #fff;
  color: #444;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.configurator-model-selector .category-tab:hover {
  border-color: #4a90e2;
  color: #4a90e2;
}

.configurator-model-selector .category-tab.active {
  background: #4a90e2;
  border-color: #4a90e2;
  color: #fff;
  box-shadow: 0 8px 20px rgba(74, 144, 226, 0.24);
}

.configurator-model-selector .models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.configurator-model-selector .model-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.configurator-model-selector .model-card:hover {
  border-color: #4a90e2;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.configurator-model-selector .model-preview {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 15px;
  overflow: hidden;
}

.configurator-model-selector .model-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.configurator-model-selector .preview-placeholder {
  font-size: 64px;
}

.configurator-model-selector h3 {
  text-align: center;
  margin: 0;
  color: #555;
  font-size: 18px;
}

.configurator-model-selector .empty-state {
  text-align: center;
  margin: 40px 0 0;
  color: #6b7280;
  font-size: 16px;
}

.configurator-model-selector .model-card:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .configurator-model-selector {
    padding: 24px 16px;
    overflow-y: auto;
    max-height: 100vh;
  }

  .configurator-model-selector h2 {
    font-size: 22px;
    margin-bottom: 20px;
  }

  .configurator-model-selector .category-tabs {
    gap: 8px;
    margin-bottom: 20px;
  }

  .configurator-model-selector .category-tab {
    padding: 10px 14px;
    font-size: 13px;
    min-height: 44px;
  }

  .configurator-model-selector .models-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
  }

  .configurator-model-selector .model-card {
    padding: 14px;
  }

  .configurator-model-selector .model-preview {
    height: 120px;
  }

  .configurator-model-selector .preview-placeholder {
    font-size: 48px;
  }

  .configurator-model-selector h3 {
    font-size: 15px;
  }
}
</style>

<template>
  <div class="configurator-model-selector">
    <div class="tabs" role="tablist" aria-label="Категории моделей">
      <button
        v-for="tab in categoryTabs"
        :key="tab.id"
        :id="`tab-${tab.id}`"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab--active': tab.id === activeCategory }"
        :aria-selected="tab.id === activeCategory"
        aria-controls="models-panel"
        @click="activeCategory = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="columns.length"
      id="models-panel"
      class="columns"
      :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }"
      role="tabpanel"
      :aria-labelledby="`tab-${activeCategory}`"
    >
      <section v-for="col in columns" :key="col.title || 'no-subcategory'" class="column">
        <h3 v-if="col.showTitle" class="column-header">{{ col.title }}</h3>
        <div class="card-grid">
          <div
            v-for="model in col.models"
            :key="model.id"
            class="card"
            :class="{ 'card--unavailable': model.available === false }"
            :role="model.available === false ? undefined : 'button'"
            :tabindex="model.available === false ? undefined : 0"
            :aria-disabled="model.available === false ? 'true' : undefined"
            :aria-label="model.available === false ? model.name : `Выбрать модель ${model.name}`"
            @click="onCardClick(model, $event)"
            @keydown.enter.prevent="onCardActivate(model)"
            @keydown.space.prevent="onCardActivate(model)"
          >
            <div class="card-preview">
              <img
                v-if="model.preview"
                :src="resolvePreviewUrl(model.preview)"
                :alt="model.name"
              />
              <div v-else class="card-preview-placeholder" aria-hidden="true">🚂</div>
            </div>
            <div class="card-name">{{ model.name }}</div>
          </div>
        </div>
      </section>
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

const emit = defineEmits<{
  select: [model: Model];
}>();

const categoryTabs: Array<{ id: ModelCategory; label: string }> = [
  { id: "locomotives", label: "Локомотивы" },
  { id: "metro-cars", label: "Вагоны метро" },
  { id: "electric-and-diesel-trains", label: "Электропоезда и дизель-поезда" },
  { id: "passenger-cars", label: "Пассажирские вагоны" },
  { id: "special-cars", label: "Специальные вагоны" },
  { id: "parts", label: "Детали" },
];

// Fixed column order per tab. Subcategories not listed here fall to the end
// in first-seen order.
const subcategoryOrder: Partial<Record<ModelCategory, string[]>> = {
  locomotives: ["Грузовые", "Пассажирские", "Промышленные/маневровые"],
  "metro-cars": ["Ключевые проекты", "Экспорт", "Спецпроекты"],
  "electric-and-diesel-trains": ["Электропоезда", "Дизель-поезда"],
  "passenger-cars": ["Одноэтажные", "Двухэтажные"],
  "special-cars": ["Специальные вагоны"],
};

const activeCategory = ref<ModelCategory>("locomotives");

interface Column {
  title: string;
  showTitle: boolean;
  models: Model[];
}

const columns = computed<Column[]>(() => {
  const filtered = props.models.filter((m) => {
    if (m.category) return m.category === activeCategory.value;
    return activeCategory.value === "special-cars";
  });

  // Group by subcategory
  const groups = new Map<string, Model[]>();
  for (const m of filtered) {
    const key = m.subcategory ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const order = subcategoryOrder[activeCategory.value] ?? [];
  const orderedKeys: string[] = [];
  for (const key of order) {
    if (groups.has(key)) orderedKeys.push(key);
  }
  for (const key of groups.keys()) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  }

  // If every model in this tab has no subcategory, render a single
  // column without a header.
  const allHaveNoSubcategory = orderedKeys.length === 1 && orderedKeys[0] === "";

  return orderedKeys.map((key) => ({
    title: key,
    showTitle: !allHaveNoSubcategory && key !== "",
    models: groups.get(key)!,
  }));
});

function onCardClick(model: Model, event: MouseEvent) {
  if (model.available === false) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit("select", model);
}

function onCardActivate(model: Model) {
  if (model.available === false) return;
  emit("select", model);
}

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
  margin: 0 auto;
  padding: 0 32px 60px;
  color: #1a1a1a;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    Cantarell, sans-serif;
  overflow-y: auto;
  max-height: 100vh;
}

/* Tabs row */
.configurator-model-selector .tabs {
  display: flex;
  border-bottom: 1px solid #d0d0d0;
  margin-bottom: 40px;
}
.configurator-model-selector .tab {
  flex: 1;
  padding: 14px 8px;
  background: transparent;
  border: none;
  border-right: 1px solid #d0d0d0;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #1a1a1a;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.configurator-model-selector .tab:last-child {
  border-right: none;
}
.configurator-model-selector .tab:hover {
  color: #00a4cf;
}
.configurator-model-selector .tab--active {
  color: #00a4cf;
  box-shadow: inset 0 -2px 0 #00a4cf;
}
.configurator-model-selector .tab:focus-visible {
  outline: 2px solid #00a4cf;
  outline-offset: -2px;
}

/* Columns */
.configurator-model-selector .columns {
  display: grid;
  gap: 40px;
  align-items: start;
  padding: 8px 0 40px;
}
.configurator-model-selector .column {
  min-width: 0;
}
.configurator-model-selector .column-header {
  margin: 0 0 28px;
  padding-bottom: 12px;
  border-bottom: 1px solid #d0d0d0;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}
.configurator-model-selector .card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 20px;
}

/* Card */
.configurator-model-selector .card {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  position: relative;
}
.configurator-model-selector .card-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.configurator-model-selector .card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.configurator-model-selector .card-preview-placeholder {
  font-size: 48px;
}
.configurator-model-selector .card-name {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.35;
  color: #333;
}
.configurator-model-selector .card:focus-visible {
  outline: 2px solid #00a4cf;
  outline-offset: 3px;
}

/* Unavailable card */
.configurator-model-selector .card--unavailable {
  cursor: not-allowed;
}
.configurator-model-selector .card--unavailable .card-preview img,
.configurator-model-selector .card--unavailable .card-name {
  opacity: 0.35;
}
.configurator-model-selector .card--unavailable::after {
  content: "Модель скоро появится";
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  background: rgba(30, 30, 30, 0.92);
  color: #fff;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  white-space: nowrap;
  z-index: 2;
}
.configurator-model-selector .card--unavailable:hover::after,
.configurator-model-selector .card--unavailable:focus-within::after {
  opacity: 1;
}

/* Empty state (should not trigger after Task 4) */
.configurator-model-selector .empty-state {
  text-align: center;
  margin: 40px 0 0;
  color: #6b7280;
  font-size: 16px;
}

/* Mobile */
@media (max-width: 768px) {
  .configurator-model-selector .tabs {
    overflow-x: auto;
  }
  .configurator-model-selector .tab {
    flex: 0 0 auto;
    padding: 14px 16px;
    font-size: 12px;
  }
  .configurator-model-selector .columns {
    grid-template-columns: 1fr !important;
    gap: 32px;
    padding: 8px 8px 32px;
  }
  .configurator-model-selector .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 14px;
  }
}

@media (max-width: 480px) {
  .configurator-model-selector .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>

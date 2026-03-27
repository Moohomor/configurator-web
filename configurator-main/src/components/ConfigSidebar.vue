<template>
  <div id="configurator-sidebar" class="configurator-sidebar">
    <div class="sidebar-header">
      <h2>Конфигуратор</h2>
      <BaseButton variant="secondary" @click="$emit('back')">
        ← Назад к выбору
      </BaseButton>
    </div>

    <div class="sidebar-section" v-if="texturePacks && texturePacks.length > 0">
      <h3>Текстур-паки</h3>
      <div class="texture-packs-list">
        <div
          v-for="pack in texturePacks"
          :key="pack.id"
          class="texture-pack-item"
          :class="{ active: selectedTexturePack?.id === pack.id }"
          role="button"
          tabindex="0"
          :aria-pressed="selectedTexturePack?.id === pack.id"
          @click="$emit('selectTexturePack', pack)"
          @keydown.enter.prevent="$emit('selectTexturePack', pack)"
          @keydown.space.prevent="$emit('selectTexturePack', pack)"
        >
          <span class="pack-name">{{ pack.name }}</span>
        </div>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-header">
        <h3>Детали модели</h3>
        <BaseButton
          v-if="hasHiddenParts"
          variant="primary"
          small
          @click="$emit('showAll')"
          title="Показать все детали"
        >
          Показать все
        </BaseButton>
        <BaseButton
          v-else
          variant="danger"
          small
          @click="$emit('hideAll')"
          title="Скрыть все детали"
        >
          Скрыть все
        </BaseButton>
      </div>

      <!-- Описание выбранной детали -->
      <div v-if="selectedPart" class="part-description">
        <h4>{{ selectedPart.name }}</h4>
        <p v-if="selectedPart.description" class="description-text">
          {{ selectedPart.description }}
        </p>
        <div class="part-meta">
          <span class="meta-label">Материал:</span>
          <span class="meta-value">{{ selectedPart.materialName }}</span>
        </div>
      </div>

      <div class="parts-list">
        <div
          v-for="part in parts"
          :key="part.name"
          class="part-item"
          :class="{
            selected: selectedPart?.name === part.name,
            hidden: part.visible === false,
          }"
        >
          <div
            class="part-info"
            role="button"
            tabindex="0"
            :aria-label="`Выбрать деталь ${part.name}`"
            @click="$emit('selectPart', part)"
            @keydown.enter.prevent="$emit('selectPart', part)"
            @keydown.space.prevent="$emit('selectPart', part)"
          >
            <span class="part-name">{{ part.name }}</span>
            <span class="part-material">{{ part.materialName }}</span>
          </div>

          <BaseButton
            :variant="part.visible === false ? 'primary' : 'danger'"
            small
            @click.stop="$emit('toggleVisibility', part)"
            :title="
              part.visible === false ? 'Показать деталь' : 'Скрыть деталь'
            "
          >
            {{ part.visible === false ? 'Показать' : 'Скрыть' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <BaseButton variant="danger" @click="$emit('reset')">
        Сбросить всё
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ModelPart, TexturePack } from '../types/models';
import BaseButton from './BaseButton.vue';

interface Props {
  parts: ModelPart[];
  texturePacks?: TexturePack[];
  selectedPart: ModelPart | null;
  selectedTexturePack: TexturePack | null;
}

const props = defineProps<Props>();

const hasHiddenParts = computed(() => {
  return props.parts.some((part) => part.visible === false);
});

defineEmits<{
  selectPart: [part: ModelPart];
  selectTexturePack: [pack: TexturePack];
  toggleVisibility: [part: ModelPart];
  hideAll: [];
  showAll: [];
  back: [];
  reset: [];
}>();
</script>

<style>
.configurator-sidebar {
  width: 320px;
  height: 100%;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-header h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #333;
}

.sidebar-section {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  gap: 12px;
}

.sidebar-section h3 {
  margin: 0;
  font-size: 16px;
  color: #555;
  font-weight: 600;
  flex: 1;
}

.color-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  border-color: #bbb;
}

.color-option.active {
  border-color: #4a90e2;
  background: #f0f7ff;
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid #ddd;
}

.parts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.part-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s;
  gap: 8px;
}

.part-item:hover {
  background: #f9f9f9;
  border-color: #bbb;
}

.part-item.selected {
  border-color: #4a90e2;
  background: #f0f7ff;
}

.part-item.hidden {
  opacity: 0.5;
}

.part-item.hidden:hover {
  opacity: 0.7;
}

.part-info:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
  border-radius: 4px;
}

.part-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.part-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.part-material {
  font-size: 12px;
  color: #888;
}

.visibility-toggle {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.visibility-toggle:hover {
  background: #f0f7ff;
  border-color: #4a90e2;
  transform: scale(1.1);
}

.visibility-toggle:active {
  transform: scale(0.95);
}

.visibility-toggle.hidden {
  background: #fff5f5;
  border-color: #ffcdd2;
}

.visibility-toggle.hidden:hover {
  background: #ffebee;
  border-color: #ef5350;
}

.eye-icon {
  font-size: 20px;
  color: #333;
  transition: color 0.2s;
  user-select: none;
}

.visibility-toggle.hidden .eye-icon {
  color: #999;
}

.visibility-toggle:hover .eye-icon {
  color: #4a90e2;
}

.visibility-toggle.hidden:hover .eye-icon {
  color: #ef5350;
}

.color-apply-button {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.color-apply-button:hover:not(:disabled) {
  background: #357abd;
}

.color-apply-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.sidebar-footer {
  padding: 20px;
  margin-top: auto;
}

.sidebar-footer .base-button {
  width: 100%;
}

.part-description {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.part-description h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.description-text {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.part-meta {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.meta-label {
  color: #888;
  font-weight: 500;
}

.meta-value {
  color: #555;
}

.texture-packs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.texture-pack-item {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.texture-pack-item:hover {
  border-color: #4a90e2;
  background: #f0f7ff;
}

.texture-pack-item:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
}

.texture-pack-item.active {
  border-color: #4a90e2;
  background: #4a90e2;
}

.texture-pack-item.active .pack-name {
  color: #fff;
  font-weight: 600;
}

.pack-name {
  font-size: 14px;
  color: #333;
}

/* Мобильные стили */
@media (max-width: 768px) {
  .configurator-sidebar {
    width: 320px;
    max-height: 100%;
  }

  .sidebar-header h2 {
    font-size: 20px;
  }

  .texture-pack-item {
    min-height: 52px;
    display: flex;
    align-items: center;
  }

  .pack-name {
    font-size: 15px;
  }

  .part-item {
    padding: 14px 12px;
    gap: 10px;
  }

  .part-name {
    font-size: 15px;
  }

  .part-material {
    font-size: 13px;
  }

  .parts-list {
    max-height: none;
  }
}
</style>

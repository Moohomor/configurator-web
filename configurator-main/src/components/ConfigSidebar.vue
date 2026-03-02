<template>
  <div class="configurator-sidebar">
    <div class="sidebar-header">
      <h2>Конфигуратор</h2>
      <button class="back-button" @click="$emit('back')">
        ← Назад к выбору
      </button>
    </div>

    <div class="sidebar-section" v-if="texturePacks && texturePacks.length > 0">
      <h3>Текстур-паки</h3>
      <div class="texture-packs-list">
        <div
          v-for="pack in texturePacks"
          :key="pack.id"
          class="texture-pack-item"
          :class="{ active: selectedTexturePack?.id === pack.id }"
          @click="$emit('selectTexturePack', pack)"
        >
          <span class="pack-name">{{ pack.name }}</span>
        </div>
      </div>
    </div>

    <div class="sidebar-section">
      <h3>Детали модели</h3>

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
          :class="{ selected: selectedPart?.name === part.name }"
          @click="$emit('selectPart', part)"
        >
          <div class="part-info">
            <span class="part-name">{{ part.name }}</span>
            <span class="part-material">{{ part.materialName }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="reset-button" @click="$emit('reset')">Сбросить всё</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelPart, TexturePack } from "../types/models";

interface Props {
  parts: ModelPart[];
  texturePacks?: TexturePack[];
  selectedPart: ModelPart | null;
  selectedTexturePack: TexturePack | null;
}

defineProps<Props>();

defineEmits<{
  selectPart: [part: ModelPart];
  selectTexturePack: [pack: TexturePack];
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

.back-button {
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-button:hover {
  background: #e8e8e8;
}

.sidebar-section {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-section h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #555;
  font-weight: 600;
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
  cursor: pointer;
  transition: all 0.2s;
}

.part-item:hover {
  background: #f9f9f9;
  border-color: #bbb;
}

.part-item.selected {
  border-color: #4a90e2;
  background: #f0f7ff;
}

.part-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.reset-button {
  width: 100%;
  background: #f44336;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.reset-button:hover {
  background: #d32f2f;
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
</style>

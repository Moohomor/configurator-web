<template>
  <div class="configurator-model-selector">
    <h2>Выберите модель</h2>
    <div class="models-grid">
      <div
        v-for="model in models"
        :key="model.id"
        class="model-card"
        @click="$emit('select', model)"
      >
        <div class="model-preview">
          <img v-if="model.preview" :src="model.preview" :alt="model.name" />
          <div v-else class="preview-placeholder">🚂</div>
        </div>
        <h3>{{ model.name }}</h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from "../types/models";

interface Props {
  models: Model[];
}

defineProps<Props>();

defineEmits<{
  select: [model: Model];
}>();
</script>

<style>
.configurator-model-selector {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.configurator-model-selector h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
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
</style>


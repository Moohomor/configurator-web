<template>
  <div id="model-info-panel" class="model-info-panel">
    <div class="panel-header">
      <h2 class="panel-title">{{ model.name }}</h2>
      <div class="panel-tags" v-if="model.subcategory || model.year">
        <span v-if="model.subcategory" class="tag">{{ model.subcategory }}</span>
        <span v-if="model.year" class="tag tag--secondary">{{ model.year }} г.</span>
      </div>
    </div>

    <div class="panel-body">
      <p v-if="model.description" class="description">{{ model.description }}</p>
      <p v-else class="description description--empty">Описание отсутствует</p>

      <div v-if="model.maxSpeed || model.power" class="specs">
        <h3 class="specs-title">Характеристики</h3>
        <div class="specs-grid">
          <div v-if="model.maxSpeed" class="spec-item">
            <span class="spec-label">Макс. скорость</span>
            <span class="spec-value">{{ model.maxSpeed }} км/ч</span>
          </div>
          <div v-if="model.power" class="spec-item">
            <span class="spec-label">Мощность</span>
            <span class="spec-value">{{ model.power }} кВт</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '../types/models';

defineProps<{ model: Model }>();
</script>

<style scoped>
.model-info-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, sans-serif;
}

.panel-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.panel-title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-block;
  padding: 3px 8px;
  background: #e8f0fd;
  color: #4a90e2;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag--secondary {
  background: #f5f5f5;
  color: #666;
}

.panel-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.description {
  margin: 0;
  font-size: 13px;
  color: #444;
  line-height: 1.6;
}

.description--empty {
  color: #999;
  font-style: italic;
}

.specs-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.specs-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  gap: 12px;
}

.spec-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.spec-value {
  font-size: 13px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
}
</style>

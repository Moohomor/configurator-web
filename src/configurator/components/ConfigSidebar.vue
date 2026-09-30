<template>
  <div id="configurator-sidebar" class="configurator-sidebar">
    <div class="sidebar-header">
      <h2>{{ props.title ?? 'Конфигуратор' }}</h2>
      <BaseButton variant="secondary" @click="$emit('back')">
        {{ props.backLabel ?? '← Назад к выбору' }}
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
            {{ part.visible === false ? "Показать" : "Скрыть" }}
          </BaseButton>
        </div>
      </div>
    </div>
    <div class="sidebar-section" v-if="lightPosition">
      <div class="section-header">
        <h3>Освещение</h3>
        <label class="light-helper-toggle">
          <input
            type="checkbox"
            :checked="showLightHelper"
            @change="$emit('lightHelperToggle', ($event.target as HTMLInputElement).checked)"
          />
          Показать на сцене
        </label>
      </div>

      <!-- Пресеты -->
      <div class="light-presets">
        <button class="light-preset-btn" @click="setPreset('top')" title="Свет сверху">↑ Сверху</button>
        <button class="light-preset-btn" @click="setPreset('front')" title="Свет спереди">↗ Спереди</button>
        <button class="light-preset-btn" @click="setPreset('left')" title="Свет слева">← Слева</button>
        <button class="light-preset-btn" @click="setPreset('right')" title="Свет справа">→ Справа</button>
      </div>

      <!-- 2D пад для направления (XZ плоскость) -->
      <div class="light-pad-title">Направление (вид сверху)</div>
      <div
        ref="padRef"
        class="light-pad"
        @mousedown.prevent="onPadStart"
        @touchstart.prevent="onPadStart"
      >
        <div class="light-pad-axis-x"></div>
        <div class="light-pad-axis-y"></div>
        <div class="light-pad-dot" :style="dotStyle"></div>
      </div>
      <div class="light-pad-axis-labels">
        <span>← X</span>
        <span>Z ↕</span>
        <span>X →</span>
      </div>

      <!-- Слайдер высоты -->
      <div class="light-height-row">
        <span class="light-height-name">Высота</span>
        <span class="light-height-value">{{ lightPosition.y.toFixed(1) }}</span>
      </div>
      <input
        class="light-height-slider"
        type="range"
        min="0"
        max="25"
        step="0.5"
        :value="lightPosition.y"
        @input="$emit('lightPositionChange', { ...lightPosition, y: +($event.target as HTMLInputElement).value })"
      />
    </div>
    <div class="sidebar-footer">
      <BaseButton variant="danger" @click="$emit('reset')">
        Сбросить всё
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";
import type { ModelPart, TexturePack } from "../types/models";
import BaseButton from "./BaseButton.vue";

interface Props {
  parts: ModelPart[];
  texturePacks?: TexturePack[];
  selectedPart: ModelPart | null;
  selectedTexturePack: TexturePack | null;
  lightPosition?: { x: number; y: number; z: number };
  showLightHelper?: boolean;
  /** Заголовок панели (в уроках — название модели). */
  title?: string;
  /** Подпись кнопки возврата (в уроках — «в каталог»). */
  backLabel?: string;
}

const props = defineProps<Props>();

const hasHiddenParts = computed(() => {
  return props.parts.some((part) => part.visible === false);
});

const emit = defineEmits<{
  selectPart: [part: ModelPart];
  selectTexturePack: [pack: TexturePack];
  toggleVisibility: [part: ModelPart];
  hideAll: [];
  showAll: [];
  back: [];
  reset: [];
  lightPositionChange: [pos: { x: number; y: number; z: number }];
  lightHelperToggle: [visible: boolean];
}>();

// ── Управление источником света ─────────────────────────────────

const PAD_RANGE = 15;
const padRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

const dotStyle = computed(() => {
  const pos = props.lightPosition;
  if (!pos) return { left: "50%", top: "50%" };
  const x = Math.max(-PAD_RANGE, Math.min(PAD_RANGE, pos.x));
  const z = Math.max(-PAD_RANGE, Math.min(PAD_RANGE, pos.z));
  // На паде: X → горизонталь, Z → вертикаль (верх пада = положительный Z)
  const left = (x / PAD_RANGE) * 50 + 50;
  const top = (-z / PAD_RANGE) * 50 + 50;
  return { left: `${left}%`, top: `${top}%` };
});

function posFromEvent(event: MouseEvent | TouchEvent): { x: number; z: number } {
  const pad = padRef.value;
  if (!pad) return { x: 0, z: 0 };
  const rect = pad.getBoundingClientRect();
  const clientX = "touches" in event ? event.touches[0]!.clientX : event.clientX;
  const clientY = "touches" in event ? event.touches[0]!.clientY : event.clientY;
  const rx = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const ry = Math.max(0, Math.min(rect.height, clientY - rect.top));
  const x = ((rx / rect.width) - 0.5) * 2 * PAD_RANGE;
  const z = -((ry / rect.height) - 0.5) * 2 * PAD_RANGE;
  return {
    x: Math.round(x * 2) / 2,
    z: Math.round(z * 2) / 2,
  };
}

function onPadStart(event: MouseEvent | TouchEvent) {
  isDragging.value = true;
  const { x, z } = posFromEvent(event);
  emit("lightPositionChange", { ...props.lightPosition!, x, z });
  window.addEventListener("mousemove", onPadMove);
  window.addEventListener("mouseup", onPadEnd);
  window.addEventListener("touchmove", onPadMove as EventListener, { passive: false });
  window.addEventListener("touchend", onPadEnd);
}

function onPadMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  if ("touches" in event) event.preventDefault();
  const { x, z } = posFromEvent(event);
  emit("lightPositionChange", { ...props.lightPosition!, x, z });
}

function onPadEnd() {
  isDragging.value = false;
  window.removeEventListener("mousemove", onPadMove);
  window.removeEventListener("mouseup", onPadEnd);
  window.removeEventListener("touchmove", onPadMove as EventListener);
  window.removeEventListener("touchend", onPadEnd);
}

onBeforeUnmount(onPadEnd);

const PRESETS: Record<string, { x: number; y: number; z: number }> = {
  top:   { x: 0,   y: 20, z: 0  },
  front: { x: 0,   y: 8,  z: 15 },
  left:  { x: -15, y: 8,  z: 0  },
  right: { x: 15,  y: 8,  z: 0  },
};

function setPreset(key: string) {
  emit("lightPositionChange", { ...PRESETS[key]! });
}
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

/* ── Освещение ────────────────────────────────────────────────── */

.light-helper-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.light-helper-toggle input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: #4a90e2;
  flex-shrink: 0;
}


.light-presets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 14px;
}

.light-preset-btn {
  padding: 7px 6px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 12px;
  color: #555;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  text-align: center;
}

.light-preset-btn:hover {
  background: #e8f0fe;
  border-color: #4a90e2;
  color: #4a90e2;
}

.light-pad-title {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
  text-align: center;
}

.light-pad {
  width: 100%;
  aspect-ratio: 1;
  background: #f0f4f8;
  border: 1px solid #d0d7df;
  border-radius: 10px;
  position: relative;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  overflow: hidden;
}

.light-pad-axis-x {
  position: absolute;
  width: 100%;
  height: 1px;
  top: 50%;
  left: 0;
  background: #c8d0da;
}

.light-pad-axis-y {
  position: absolute;
  width: 1px;
  height: 100%;
  left: 50%;
  top: 0;
  background: #c8d0da;
}

.light-pad-dot {
  position: absolute;
  width: 16px;
  height: 16px;
  background: radial-gradient(circle at 40% 35%, #ffe066, #f5a623);
  border: 2px solid #d4880a;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px 2px rgba(245, 166, 35, 0.5);
  pointer-events: none;
  transition: box-shadow 0.1s;
}

.light-pad:active .light-pad-dot {
  box-shadow: 0 0 14px 4px rgba(245, 166, 35, 0.7);
}

.light-pad-axis-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #aaa;
  margin: 4px 2px 12px;
}

.light-height-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.light-height-name {
  font-size: 13px;
  color: #555;
}

.light-height-value {
  font-size: 12px;
  color: #888;
  min-width: 32px;
  text-align: right;
}

.light-height-slider {
  width: 100%;
  accent-color: #4a90e2;
  cursor: pointer;
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

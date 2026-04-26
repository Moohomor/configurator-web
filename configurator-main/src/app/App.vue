<template>
  <div class="app">
    <!-- Экран выбора модели -->
    <ModelSelector
      v-if="!state.selectedModel"
      :models="models"
      @select="selectModel"
    />

    <!-- Экран конфигуратора -->
    <div v-else class="configurator">
      <!-- Шторка сайдбара -->
      <div
        class="sidebar-drawer"
        :class="{ 'sidebar-drawer--open': sidebarOpen }"
      >
        <ConfigSidebar
          :parts="state.parts"
          :texture-packs="state.selectedModel?.texturePacks"
          :selected-part="state.selectedPart"
          :selected-texture-pack="state.selectedTexturePack"
          :light-position="lightPosition"
          :show-light-helper="showLightHelper"
          @select-part="selectPart"
          @select-texture-pack="selectTexturePack"
          @toggle-visibility="togglePartVisibility"
          @hide-all="hideAllParts"
          @show-all="showAllParts"
          @back="goBack"
          @reset="resetConfiguration"
          @light-position-change="updateLightPosition"
          @light-helper-toggle="(v) => (showLightHelper = v)"
        />

        <!-- Кнопка-закладка-->
        <button
          class="sidebar-tab"
          @click="toggleSidebar"
          :aria-label="
            sidebarOpen
              ? 'Закрыть панель конфигуратора'
              : 'Открыть панель конфигуратора'
          "
          :aria-expanded="sidebarOpen"
          aria-controls="configurator-sidebar"
        >
          <!-- Крестик -->
          <svg
            v-if="sidebarOpen"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
          <!-- Бургер меню когда закрыто -->
          <svg
            v-else
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
            />
          </svg>
        </button>
      </div>

      <!-- Тёмный оверлей (только для левого сайдбара — info panel самодостаточен) -->
      <div
        v-if="sidebarOpen"
        class="mobile-overlay"
        @click="closeAllPanels"
        aria-hidden="true"
      />

      <div class="viewer-wrapper">
        <div class="focus-controls-wrapper">
          <div class="focus-controls-panel">
            <div class="focus-controls-header">
              <h3>Фокус</h3>
            </div>
            <div class="focus-controls-body">
              <label class="focus-control-label">
                <input
                  type="checkbox"
                  :checked="viewState.focusOnSelectedPart"
                  @change="toggleFocusMode"
                />
                Фокус на детали
              </label>
            </div>
          </div>
        </div>

        <ModelViewer
          :model-path="state.selectedModel.path!"
          :selected-part="state.selectedPart"
          :selected-texture-pack="state.selectedTexturePack"
          :visible-parts="visiblePartsSet"
          :focus-on-selected-part="viewState.focusOnSelectedPart"
          :is-animation-playing="animationState.isPlaying"
          :animation-time="animationState.seekTime"
          :animation-speed="animationState.speed"
          :animation-loop="animationState.loop"
          :light-position="lightPosition"
          :show-light-helper="showLightHelper"
          @parts-loaded="onPartsLoaded"
          @part-click="selectPart"
          @animations-loaded="onAnimationsLoaded"
          @animation-time-update="onAnimationTimeUpdate"
        />

        <!-- Контролы анимации -->
        <div
          class="animation-controls-wrapper"
          :class="{ 'animation-controls-wrapper--open': animControlsOpen }"
        >
          <!-- Кнопка-ручка -->
          <button
            v-if="animationState.hasAnimations"
            class="animation-tab"
            @click="toggleAnimControls"
            :aria-label="
              animControlsOpen
                ? 'Скрыть управление анимацией'
                : 'Показать управление анимацией'
            "
            :aria-expanded="animControlsOpen"
          >
            <span class="animation-tab-handle" aria-hidden="true"></span>
          </button>

          <AnimationControls
            :has-animations="animationState.hasAnimations"
            :is-playing="animationState.isPlaying"
            :current-time="animationState.currentTime"
            :duration="animationState.duration"
            :loop="animationState.loop"
            :playback-speed="animationState.speed"
            @play="playAnimation"
            @pause="pauseAnimation"
            @seek="seekAnimation"
            @speed-change="changeAnimationSpeed"
            @loop-change="changeAnimationLoop"
          />
        </div>
      </div>

      <!-- Панель информации о модели -->
      <div
        class="info-panel-drawer"
        :class="{ 'info-panel-drawer--open': infoPanelOpen }"
      >
        <button
          class="info-panel-tab"
          @click="toggleInfoPanel"
          :aria-label="
            infoPanelOpen
              ? 'Закрыть информацию о модели'
              : 'Открыть информацию о модели'
          "
          :aria-expanded="infoPanelOpen"
          aria-controls="model-info-panel"
        >
          <svg
            v-if="infoPanelOpen"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
            />
          </svg>
        </button>

        <div class="info-panel-content">
          <ModelInfoPanel
            v-if="state.selectedModel"
            :model="state.selectedModel"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AnimationControls from '../components/AnimationControls.vue';
import ConfigSidebar from '../components/ConfigSidebar.vue';
import ModelInfoPanel from '../components/ModelInfoPanel.vue';
import ModelSelector from '../components/ModelSelector.vue';
import ModelViewer from '../components/ModelViewer.vue';
import type {
  ConfiguratorState,
  Model,
  ModelPart,
  TexturePack,
} from '../types/models';

const models = reactive<Model[]>([]);

const state = reactive<ConfiguratorState>({
  selectedModel: null,
  selectedPart: null,
  parts: [],
  selectedTexturePack: null,
});

// Состояние мобильных панелей
const sidebarOpen = ref(false);
const animControlsOpen = ref(false);
const infoPanelOpen = ref(false);

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  if (sidebarOpen.value) infoPanelOpen.value = false;
}

function toggleInfoPanel() {
  infoPanelOpen.value = !infoPanelOpen.value;
  if (infoPanelOpen.value) sidebarOpen.value = false;
}

function closeAllPanels() {
  sidebarOpen.value = false;
  infoPanelOpen.value = false;
}

function toggleAnimControls() {
  animControlsOpen.value = !animControlsOpen.value;
}

// Состояние анимации
const animationState = reactive({
  hasAnimations: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loop: true,
  speed: 1,
  seekTime: undefined as number | undefined,
});

const viewState = reactive({
  focusOnSelectedPart: false,
});

const lightPosition = reactive({ x: 5, y: 10, z: 7 });
const showLightHelper = ref(true);

function updateLightPosition(pos: { x: number; y: number; z: number }) {
  lightPosition.x = pos.x;
  lightPosition.y = pos.y;
  lightPosition.z = pos.z;
}

const visiblePartsSet = computed(() => {
  const visibleSet = new Set<string>();
  state.parts.forEach((part) => {
    if (part.visible !== false) {
      visibleSet.add(part.name);
    }
  });
  return visibleSet;
});

onMounted(async () => {
  const loadedModels = await window.configuratorAPI.loadModels();
  models.push(...loadedModels);
});

function selectModel(model: Model) {
  state.selectedModel = model;
  state.parts = [];
  state.selectedPart = null;
  state.selectedTexturePack = null;
  sidebarOpen.value = false;
  animControlsOpen.value = false;
  infoPanelOpen.value = false;
}

function onPartsLoaded(parts: ModelPart[]) {
  state.parts = parts.map((part) => ({
    ...part,
    visible: true,
  }));
}

function selectPart(part: ModelPart) {
  state.selectedPart = part;
}

function selectTexturePack(pack: TexturePack) {
  state.selectedTexturePack = pack;
}

function goBack() {
  state.selectedModel = null;
  state.selectedPart = null;
  state.parts = [];
  state.selectedTexturePack = null;
  infoPanelOpen.value = false;
}

function resetConfiguration() {
  state.selectedPart = null;
  state.selectedTexturePack = null;
}

function toggleFocusMode() {
  viewState.focusOnSelectedPart = !viewState.focusOnSelectedPart;
}

// Фунции для управления видимостью деталей
function togglePartVisibility(part: ModelPart) {
  const index = state.parts.findIndex((p) => p.name === part.name);
  if (index !== -1 && state.parts[index]) {
    state.parts[index]!.visible = !state.parts[index]!.visible;
  }
}

function hideAllParts() {
  state.parts.forEach((part) => {
    part.visible = false;
  });
}

function showAllParts() {
  state.parts.forEach((part) => {
    part.visible = true;
  });
}

function onAnimationsLoaded(hasAnimations: boolean, duration: number) {
  animationState.hasAnimations = hasAnimations;
  animationState.duration = duration;
  animationState.currentTime = 0;
  animationState.isPlaying = false;
}

function onAnimationTimeUpdate(time: number) {
  animationState.currentTime = time;
  animationState.seekTime = undefined;
}

function playAnimation() {
  animationState.isPlaying = true;
}

function pauseAnimation() {
  animationState.isPlaying = false;
}

function seekAnimation(time: number) {
  animationState.seekTime = time;
  animationState.currentTime = time;
}

function changeAnimationSpeed(speed: number) {
  animationState.speed = speed;
}

function changeAnimationLoop(loop: boolean) {
  animationState.loop = loop;
}
</script>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, sans-serif;
}

.configurator {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

/* Обёртка сайдбара */
.sidebar-drawer {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

/* Закладка скрыта */
.sidebar-tab {
  display: none;
}

/* Оверлей скрыт */
.mobile-overlay {
  display: none;
}

/* Кнопка-ручка анимации */
.animation-tab {
  display: none;
}

.viewer-wrapper {
  flex: 1;
  height: 100%;
  background: #f5f5f5;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.focus-controls-wrapper {
  position: absolute;
  /* Явно якорим к правому нижнему углу viewer-wrapper */
  inset: auto 20px 20px auto;
  top: auto !important;
  left: auto !important;
  right: 20px !important;
  bottom: 20px !important;
  width: max-content;
  max-width: 280px;
  z-index: 12;
  pointer-events: auto;
}

.focus-controls-panel {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 210px;
  width: max-content;
  display: inline-block;
}

.focus-controls-header {
  margin-bottom: 10px;
}

.focus-controls-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.focus-controls-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* В стиле чекбокса "Повтор" из AnimationControls */
.focus-control-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  user-select: none;
}

.focus-control-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4a90e2;
}

.animation-controls-wrapper {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  min-width: 400px;
  max-width: 600px;
}

/* ========== Панель информации о модели ========== */
.info-panel-drawer {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  flex-direction: row;
  z-index: 90;
  transform: translateX(300px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-panel-drawer--open {
  transform: translateX(0);
  z-index: 101;
}

.info-panel-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  min-height: 72px;
  align-self: center;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 12px 0 0 12px;
  cursor: pointer;
  box-shadow: -3px 2px 10px rgba(0, 0, 0, 0.25);
  padding: 10px 0;
  touch-action: manipulation;
}

.info-panel-tab:focus-visible {
  outline: 3px solid #ffd600;
  outline-offset: 2px;
}

.info-panel-content {
  width: 300px;
  height: 100%;
  overflow-y: auto;
  background: white;
  border-left: 1px solid #e0e0e0;
  flex-shrink: 0;
}

/* ========================================================
   Мобильные стили (≤ 768px)
   ======================================================== */
@media (max-width: 768px) {
  /* Сайдбар */
  .sidebar-drawer {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transform: translateX(-320px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-direction: row;
    align-items: flex-start;
  }

  .sidebar-drawer--open {
    transform: translateX(0);
  }

  /* Кнопка-закладка */
  .sidebar-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 44px;
    min-height: 72px;
    align-self: center;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 0 12px 12px 0;
    cursor: pointer;
    box-shadow: 3px 2px 10px rgba(0, 0, 0, 0.25);
    padding: 10px 0;
    touch-action: manipulation;
  }

  .sidebar-tab:focus-visible {
    outline: 3px solid #ffd600;
    outline-offset: 2px;
  }

  /* Тёмный оверлей */
  .mobile-overlay {
    display: block;
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 99;
    cursor: pointer;
    backdrop-filter: blur(1px);
  }

  .viewer-wrapper {
    width: 100%;
    flex: 1;
  }

  /* Контролы анимации */
  .animation-controls-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    /* По умолчанию торчит только ручка (52px) снизу */
    transform: translateY(calc(100% - 52px));
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: unset;
    max-width: unset;
    background: white;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.18);
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .animation-controls-wrapper--open {
    transform: translateY(0);
  }

  /* Ручка-закладка для анимации */
  .animation-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    touch-action: manipulation;
    width: 100%;
    flex-shrink: 0;
  }

  .animation-tab:focus-visible {
    outline: 3px solid #ffd600;
    outline-offset: -3px;
  }

  .animation-tab-handle {
    display: block;
    width: 36px;
    height: 4px;
    background: #ccc;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .animation-tab-label {
    font-size: 14px;
    color: #555;
    font-weight: 600;
  }
}

/* На очень узких экранах кнопки переносятся внутрь открытой панели */
@media (max-width: 364px) {
  .sidebar-drawer--open .sidebar-tab {
    position: absolute;
    top: 12px;
    right: 12px;
    align-self: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  .info-panel-drawer--open .info-panel-tab {
    position: absolute;
    top: 12px;
    right: 12px;
    align-self: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 999;
  }
}
</style>

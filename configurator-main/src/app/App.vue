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
      <ConfigSidebar
        :parts="state.parts"
        :texture-packs="state.selectedModel?.texturePacks"
        :selected-part="state.selectedPart"
        :selected-texture-pack="state.selectedTexturePack"
        @select-part="selectPart"
        @select-texture-pack="selectTexturePack"
        @toggle-visibility="togglePartVisibility"
        @hide-all="hideAllParts"
        @show-all="showAllParts"
        @back="goBack"
        @reset="resetConfiguration"
      />

      <div class="viewer-wrapper">
        <ModelViewer
          :model-path="state.selectedModel.path"
          :selected-part="state.selectedPart"
          :selected-texture-pack="state.selectedTexturePack"
          :visible-parts="visiblePartsSet"
          :is-animation-playing="animationState.isPlaying"
          :animation-time="animationState.seekTime"
          :animation-speed="animationState.speed"
          :animation-loop="animationState.loop"
          @parts-loaded="onPartsLoaded"
          @part-click="selectPart"
          @animations-loaded="onAnimationsLoaded"
          @animation-time-update="onAnimationTimeUpdate"
        />
        
        <!-- Контролы анимации -->
        <div class="animation-controls-wrapper">
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

    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, computed } from "vue";
import ModelSelector from "../components/ModelSelector.vue";
import ModelViewer from "../components/ModelViewer.vue";
import ConfigSidebar from "../components/ConfigSidebar.vue";
import AnimationControls from "../components/AnimationControls.vue";
import type {
  Model,
  ModelPart,
  ConfiguratorState,
  TexturePack,
} from "../types/models";

const models = reactive<Model[]>([]);

const state = reactive<ConfiguratorState>({
  selectedModel: null,
  selectedPart: null,
  parts: [],
  selectedTexturePack: null,
});

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

const visiblePartsSet = computed(() => {
  const visibleSet = new Set<string>();
  
  // Показываем части согласно их флагу visible
  state.parts.forEach(part => {
    if (part.visible !== false) {
      visibleSet.add(part.name);
    }
  });
  
  return visibleSet;
});

onMounted(async () => {
  // Загрузить список моделей
  const loadedModels = await window.configuratorAPI.loadModels();
  models.push(...loadedModels);
});

function selectModel(model: Model) {
  state.selectedModel = model;
  state.parts = [];
  state.selectedPart = null;
  state.selectedTexturePack = null;
}

function onPartsLoaded(parts: ModelPart[]) {
  state.parts = parts.map(part => ({
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
}

function resetConfiguration() {
  state.selectedPart = null;
  state.selectedTexturePack = null;
}

// Фунции для управления видимостью деталей
function togglePartVisibility(part: ModelPart) {
  const index = state.parts.findIndex(p => p.name === part.name);
  if (index !== -1 && state.parts[index]) {
    state.parts[index]!.visible = !state.parts[index]!.visible;
  }
}
function hideAllParts() {
  state.parts.forEach(part => {
    part.visible = false;
  });
}

function showAllParts() {
  state.parts.forEach(part => {
    part.visible = true;
  });
}

// Функции управления анимацией
function onAnimationsLoaded(hasAnimations: boolean, duration: number) {
  animationState.hasAnimations = hasAnimations;
  animationState.duration = duration;
  animationState.currentTime = 0;
  animationState.isPlaying = false;
}

function onAnimationTimeUpdate(time: number) {
  animationState.currentTime = time;
  animationState.seekTime = undefined; // Сбросить после применения
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
}

.configurator {
  display: flex;
  width: 100%;
  height: 100%;
}

.viewer-wrapper {
  flex: 1;
  height: 100%;
  background: #f5f5f5;
  position: relative;
  display: flex;
  flex-direction: column;
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
</style>

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
        @back="goBack"
        @reset="resetConfiguration"
      />

      <div class="viewer-wrapper">
        <ModelViewer
          :model-path="state.selectedModel.path"
          :selected-part="state.selectedPart"
          :selected-texture-pack="state.selectedTexturePack"
          @parts-loaded="onPartsLoaded"
          @part-click="selectPart"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from "vue";
import ModelSelector from "../components/ModelSelector.vue";
import ModelViewer from "../components/ModelViewer.vue";
import ConfigSidebar from "../components/ConfigSidebar.vue";
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
  state.parts = parts;
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
}
</style>

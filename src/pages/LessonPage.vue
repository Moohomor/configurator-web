<!-- Страница урока: 3D-конфигуратор одной модели. Задания курса считает
     трекер (src/scorm), сюда он попадает через события конфигуратора. -->
<template>
  <div class="lesson">
    <header class="lesson-bar">
      <a class="lesson-back" :href="catalogHref" @click.prevent="onBack">
        ← Каталог моделей
      </a>
      <h1 class="lesson-title">{{ model.name }}</h1>
    </header>

    <div class="configurator">
      <!-- Шторка сайдбара -->
      <div
        class="sidebar-drawer"
        :class="{ 'sidebar-drawer--open': panels.sidebarOpen.value }"
      >
        <ConfigSidebar
          :parts="parts"
          :texture-packs="model.texturePacks"
          :selected-part="selectedPart"
          :selected-texture-pack="selectedTexturePack"
          :light-position="light"
          :show-light-helper="showLightHelper"
          :title="model.name"
          back-label="← В каталог моделей"
          @select-part="selectPart"
          @select-texture-pack="selectTexturePack"
          @toggle-visibility="togglePartVisibility"
          @hide-all="() => setAllVisible(false)"
          @show-all="() => setAllVisible(true)"
          @back="onBack"
          @reset="resetConfiguration"
          @light-position-change="updateLightPosition"
          @light-helper-toggle="showLightHelper = $event"
        />

        <!-- Кнопка-закладка-->
        <button
          class="sidebar-tab"
          @click="toggleSidebar"
          :aria-label="
            panels.sidebarOpen.value
              ? 'Закрыть панель конфигуратора'
              : 'Открыть панель конфигуратора'
          "
          :aria-expanded="panels.sidebarOpen.value"
          aria-controls="configurator-sidebar"
        >
          <svg
            v-if="panels.sidebarOpen.value"
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
              d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
            />
          </svg>
        </button>
      </div>

      <!-- Тёмный оверлей (только для левого сайдбара — info panel самодостаточен) -->
      <div
        v-if="panels.sidebarOpen.value"
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
                  :checked="view.focusOnSelectedPart"
                  @change="toggleFocusMode"
                />
                Фокус на детали
              </label>
            </div>
          </div>
        </div>

        <ModelViewer
          :model-path="model.path!"
          :selected-part="selectedPart"
          :selected-texture-pack="selectedTexturePack"
          :visible-parts="visiblePartsSet"
          :focus-on-selected-part="view.focusOnSelectedPart"
          :is-animation-playing="animation.isPlaying"
          :animation-time="animation.seekTime"
          :animation-speed="animation.speed"
          :animation-loop="animation.loop"
          :light-position="light"
          :show-light-helper="showLightHelper"
          @parts-loaded="onPartsLoaded"
          @part-click="selectPart"
          @animations-loaded="onAnimationsLoaded"
          @animation-time-update="onAnimationTimeUpdate"
        />

        <!-- Контролы анимации -->
        <div
          class="animation-controls-wrapper"
          :class="{
            'animation-controls-wrapper--open': panels.animationControlsOpen.value,
          }"
        >
          <button
            v-if="animation.hasAnimations"
            class="animation-tab"
            @click="toggleAnimationControls"
            :aria-label="
              panels.animationControlsOpen.value
                ? 'Скрыть управление анимацией'
                : 'Показать управление анимацией'
            "
            :aria-expanded="panels.animationControlsOpen.value"
          >
            <span class="animation-tab-handle" aria-hidden="true"></span>
          </button>

          <AnimationControls
            :has-animations="animation.hasAnimations"
            :is-playing="animation.isPlaying"
            :current-time="animation.currentTime"
            :duration="animation.duration"
            :loop="animation.loop"
            :playback-speed="animation.speed"
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
        :class="{ 'info-panel-drawer--open': panels.infoPanelOpen.value }"
      >
        <button
          class="info-panel-tab"
          @click="toggleInfoPanel"
          :aria-label="
            panels.infoPanelOpen.value
              ? 'Закрыть информацию о модели'
              : 'Открыть информацию о модели'
          "
          :aria-expanded="panels.infoPanelOpen.value"
          aria-controls="model-info-panel"
        >
          <svg
            v-if="panels.infoPanelOpen.value"
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
          <ModelInfoPanel :model="model" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, watch } from "vue";
import AnimationControls from "@/configurator/components/AnimationControls.vue";
import ConfigSidebar from "@/configurator/components/ConfigSidebar.vue";
import ModelInfoPanel from "@/configurator/components/ModelInfoPanel.vue";
import { useConfigurator } from "@/configurator/composables/useConfigurator";
import type { ConfiguratorEventHandler } from "@/configurator/events";
import type { Model } from "@/configurator/types/models";
import { catalogHref, goToCatalog } from "@/scorm/lesson";
import type { LessonTracker } from "@/scorm/tracker";

/**
 * 3D-сцена (three.js, ~600 КБ) грузится только на странице урока: в
 * каталоге моделей она не нужна — там нет WebGL.
 */
const ModelViewer = defineAsyncComponent(
  () => import("@/configurator/components/ModelViewer.vue"),
);

const props = defineProps<{
  model: Model;
  tracker: LessonTracker;
}>();

/** Мост «события 3D-конфигуратора → задания курса». Здесь нет ни CSS-классов,
 *  ни обращений к DOM: UI сообщает смысл действия, трекер решает, что с ним делать. */
const onConfiguratorEvent: ConfiguratorEventHandler = (signal) => {
  switch (signal.event) {
    case "model-loaded":
      props.tracker.noteAnimations(props.model.id, signal.payload.hasAnimations);
      props.tracker.mark("model-loaded", props.model.id);
      break;
    case "part-selected":
      // Пустой клик по сцене снимает выделение — это не задание.
      if (signal.payload.part) {
        props.tracker.mark("part-selected", props.model.id);
      }
      break;
    case "animation-played":
      props.tracker.mark("animation-played", props.model.id);
      break;
    default:
      break;
  }
};

const {
  parts,
  selectedPart,
  selectedTexturePack,
  visiblePartsSet,
  animation,
  view,
  light,
  showLightHelper,
  panels,
  onPartsLoaded,
  onAnimationsLoaded,
  onAnimationTimeUpdate,
  selectPart,
  selectTexturePack,
  togglePartVisibility,
  setAllVisible,
  updateLightPosition,
  playAnimation,
  pauseAnimation,
  seekAnimation,
  changeAnimationSpeed,
  changeAnimationLoop,
  toggleSidebar,
  toggleInfoPanel,
  toggleAnimationControls,
  closeAllPanels,
  resetConfiguration,
  toggleFocusMode,
} = useConfigurator({ model: props.model, onEvent: onConfiguratorEvent });

function onBack(): void {
  goToCatalog();
}

// Заголовок вкладки/фрейма в LMS: имя урока, а не «Конфигуратор».
onMounted(() => {
  document.title = `${props.model.name} — 3D-конфигуратор`;
});

watch(
  () => props.model,
  (model) => {
    document.title = `${model.name} — 3D-конфигуратор`;
  },
);
</script>

<style scoped>
.lesson {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}

/* ---- верхняя полоса урока ---- */
.lesson-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.lesson-back {
  color: #357abd;
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 6px;
  padding: 4px 8px;
}
.lesson-back:hover {
  background: #f0f7ff;
  text-decoration: underline;
}

.lesson-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #00364a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.configurator {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
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

.sidebar-tab {
  display: none;
}

.mobile-overlay {
  display: none;
}

.animation-tab {
  display: none;
}

.viewer-wrapper {
  flex: 1;
  height: 100%;
  min-width: 0;
  background: #f5f5f5;
  position: relative;
  display: flex;
  flex-direction: column;
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
  .lesson-bar {
    padding: 6px 10px;
  }

  .lesson-title {
    font-size: 15px;
  }

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

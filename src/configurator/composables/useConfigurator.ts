/* =====================================================================
 * configurator/composables/useConfigurator.ts
 * Состояние 3D-конфигуратора и семантические события.
 *
 * Раньше всё это лежало прямо в App.vue вместе с логикой SCORM и
 * загрузкой каталога. Теперь состояние тестируемо и переиспользуемо,
 * а страницы (каталог / урок) просто подписываются на события.
 * ===================================================================== */
import { computed, reactive, ref, type ComputedRef, type Ref } from "vue";
import type { Model, ModelPart, TexturePack } from "../types/models";
import type {
  ConfiguratorEvent,
  ConfiguratorEventHandler,
  ConfiguratorEventMap,
  ConfiguratorEventSignal,
} from "../events";

export interface UseConfiguratorOptions {
  model: Model;
  /** Подписка на события конфигуратора (её же вешает SCORM-трекер). */
  onEvent?: ConfiguratorEventHandler;
}

export interface AnimationState {
  hasAnimations: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  speed: number;
  seekTime: number | undefined;
}

export interface PanelState {
  sidebarOpen: Ref<boolean>;
  animationControlsOpen: Ref<boolean>;
  infoPanelOpen: Ref<boolean>;
}

export function useConfigurator(options: UseConfiguratorOptions) {
  const { model, onEvent } = options;

  const parts = reactive<ModelPart[]>([]);
  const selectedPart = ref<ModelPart | null>(null);
  const selectedTexturePack = ref<TexturePack | null>(
    model.texturePacks?.[0] ?? null,
  );

  const animation = reactive<AnimationState>({
    hasAnimations: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loop: true,
    speed: 1,
    seekTime: undefined,
  });

  const view = reactive({ focusOnSelectedPart: false });
  const light = reactive({ x: 5, y: 10, z: 7 });
  const showLightHelper = ref(true);

  const panels = {
    sidebarOpen: ref(false),
    animationControlsOpen: ref(false),
    infoPanelOpen: ref(false),
  };

  /* ---- события -------------------------------------------------- */

  function emit<E extends ConfiguratorEvent>(
    event: E,
    payload: ConfiguratorEventMap[E],
  ): void {
    onEvent?.({ event, payload } as ConfiguratorEventSignal);
  }

  /* ---- детали --------------------------------------------------- */

  function onPartsLoaded(loaded: ModelPart[]): void {
    parts.splice(0, parts.length, ...loaded.map((part) => ({ ...part, visible: true })));
    // 3D-сцена загружена целиком — событие для SCORM-слоя.
    // hasAnimations к этому моменту уже известен: ModelViewer присылает
    // animationsLoaded перед partsLoaded.
    emit("model-loaded", {
      model,
      parts: loaded.length,
      hasAnimations: animation.hasAnimations,
    });
  }

  function selectPart(part: ModelPart | null): void {
    selectedPart.value = part;
    emit("part-selected", { part });
  }

  function togglePartVisibility(part: ModelPart): void {
    const index = parts.findIndex((item) => item.name === part.name);
    if (index === -1) return;
    parts[index]!.visible = !parts[index]!.visible;
    emit("parts-visibility-changed", {
      hidden: parts.filter((item) => item.visible === false).length,
    });
  }

  function setAllVisible(visible: boolean): void {
    parts.forEach((part) => {
      part.visible = visible;
    });
    emit("parts-visibility-changed", {
      hidden: parts.filter((item) => item.visible === false).length,
    });
  }

  const visiblePartsSet = computed<Set<string>>(() => {
    const visible = new Set<string>();
    parts.forEach((part) => {
      if (part.visible !== false) visible.add(part.name);
    });
    return visible;
  });

  /* ---- текстуры и освещение ------------------------------------- */

  function selectTexturePack(pack: TexturePack): void {
    selectedTexturePack.value = pack;
    emit("texture-changed", { pack });
  }

  function updateLightPosition(position: { x: number; y: number; z: number }): void {
    light.x = position.x;
    light.y = position.y;
    light.z = position.z;
  }

  /* ---- анимация ------------------------------------------------- */

  function onAnimationsLoaded(hasAnimations: boolean, duration: number): void {
    animation.hasAnimations = hasAnimations;
    animation.duration = duration;
    animation.currentTime = 0;
    animation.isPlaying = false;
  }

  function onAnimationTimeUpdate(time: number): void {
    animation.currentTime = time;
    animation.seekTime = undefined;
  }

  function playAnimation(): void {
    animation.isPlaying = true;
    emit("animation-played", {});
  }

  function pauseAnimation(): void {
    animation.isPlaying = false;
  }

  function seekAnimation(time: number): void {
    animation.seekTime = time;
    animation.currentTime = time;
  }

  function changeAnimationSpeed(speed: number): void {
    animation.speed = speed;
  }

  function changeAnimationLoop(loop: boolean): void {
    animation.loop = loop;
  }

  /* ---- панели --------------------------------------------------- */

  function toggleSidebar(): void {
    panels.sidebarOpen.value = !panels.sidebarOpen.value;
    if (panels.sidebarOpen.value) panels.infoPanelOpen.value = false;
  }

  function toggleInfoPanel(): void {
    panels.infoPanelOpen.value = !panels.infoPanelOpen.value;
    if (panels.infoPanelOpen.value) panels.sidebarOpen.value = false;
  }

  function toggleAnimationControls(): void {
    panels.animationControlsOpen.value = !panels.animationControlsOpen.value;
  }

  function closeAllPanels(): void {
    panels.sidebarOpen.value = false;
    panels.infoPanelOpen.value = false;
  }

  function resetConfiguration(): void {
    selectedPart.value = null;
    selectedTexturePack.value = model.texturePacks?.[0] ?? null;
  }

  function toggleFocusMode(): void {
    view.focusOnSelectedPart = !view.focusOnSelectedPart;
  }

  return {
    parts,
    selectedPart,
    selectedTexturePack,
    visiblePartsSet: visiblePartsSet as ComputedRef<Set<string>>,
    animation,
    view,
    light,
    showLightHelper,
    panels: panels as PanelState,
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
  };
}

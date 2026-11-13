/* =====================================================================
 * configurator/composables/useConfigurator.ts
 * Состояние 3D-конфигуратора и семантические события.
 *
 * Раньше всё это лежало прямо в App.vue вместе с логикой SCORM и
 * загрузкой каталога. Теперь состояние тестируемо и переиспользуемо,
 * а страницы (каталог / урок) просто подписываются на события.
 * ===================================================================== */
import { reactive, ref, shallowRef, type Ref } from "vue";
import type { Model, ModelPart, PartNode, TexturePack } from "../types/models";
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
  /** Иерархия модели (как в Outliner): все узлы файла без фильтрации. */
  const partTree = ref<PartNode[]>([]);
  /** id скрытых узлов. Множество заменяется целиком — так срабатывают watch. */
  const hiddenNodeIds = shallowRef<Set<string>>(new Set());
  /** id узла → id родителя (для показа предков и подсчёта видимости). */
  let parentById = new Map<string, string | null>();
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

  function indexTree(nodes: PartNode[], parent: string | null): void {
    for (const node of nodes) {
      parentById.set(node.id, parent);
      indexTree(node.children, node.id);
    }
  }

  function isNodeEffectivelyVisible(id: string): boolean {
    for (let cur: string | null | undefined = id; cur; cur = parentById.get(cur)) {
      if (hiddenNodeIds.value.has(cur)) return false;
    }
    return true;
  }

  /** Деталь видна, только если скрыт не сам меш и не один из его предков. */
  function syncPartsVisibility(): void {
    parts.forEach((part) => {
      part.visible = isNodeEffectivelyVisible(part.id);
    });
    emit("parts-visibility-changed", {
      hidden: parts.filter((item) => item.visible === false).length,
    });
  }

  function onPartsLoaded(loaded: ModelPart[], tree: PartNode[] = []): void {
    parts.splice(0, parts.length, ...loaded.map((part) => ({ ...part, visible: true })));
    partTree.value = tree;
    parentById = new Map();
    indexTree(tree, null);
    hiddenNodeIds.value = new Set();
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

  /**
   * Глаз у узла. Скрытие прячет всё поддерево; показ узла заодно показывает
   * его предков, иначе после «Скрыть все» включённая деталь осталась бы невидимой.
   */
  function toggleNodeVisibility(id: string): void {
    const next = new Set(hiddenNodeIds.value);
    if (next.has(id)) {
      next.delete(id);
      for (let cur = parentById.get(id); cur; cur = parentById.get(cur)) {
        next.delete(cur);
      }
    } else {
      next.add(id);
    }
    hiddenNodeIds.value = next;
    syncPartsVisibility();
  }

  function setAllVisible(visible: boolean): void {
    hiddenNodeIds.value = visible ? new Set() : new Set(parentById.keys());
    syncPartsVisibility();
  }

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
    animation.seekTime = undefined;
  }

  function onAnimationTimeUpdate(time: number): void {
    animation.currentTime = time;
    animation.seekTime = undefined;
  }

  function onAnimationFinished(): void {
    animation.currentTime = animation.duration;
    animation.isPlaying = false;
  }

  function playAnimation(): void {
    if (!animation.hasAnimations) return;
    animation.isPlaying = true;
    emit("animation-played", {});
  }

  function pauseAnimation(): void {
    animation.isPlaying = false;
  }

  function seekAnimation(time: number): void {
    if (!animation.hasAnimations || !Number.isFinite(time)) return;
    const position = Math.max(0, Math.min(time, animation.duration));
    animation.seekTime = position;
    animation.currentTime = position;
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
    partTree,
    hiddenNodeIds,
    animation,
    view,
    light,
    showLightHelper,
    panels: panels as PanelState,
    onPartsLoaded,
    onAnimationsLoaded,
    onAnimationTimeUpdate,
    onAnimationFinished,
    selectPart,
    selectTexturePack,
    toggleNodeVisibility,
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

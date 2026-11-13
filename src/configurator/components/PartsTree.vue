<template>
  <div
    ref="rootRef"
    class="parts-tree"
    role="tree"
    aria-label="Иерархия деталей модели"
  >
    <PartsTreeNode
      v-for="node in tree"
      :key="node.id"
      :node="node"
      :depth="0"
      :parent-id="null"
      :ancestor-hidden="false"
    />
    <p v-if="tree.length === 0" class="parts-tree-empty">Деталей нет</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, provide, reactive, ref, watch } from "vue";
import type { ModelPart, PartNode } from "../types/models";
import PartsTreeNode from "./PartsTreeNode.vue";
import { partsTreeKey, type PartsTreeContext } from "./partsTreeContext";

const props = defineProps<{
  tree: PartNode[];
  parts: ModelPart[];
  selectedPart: ModelPart | null;
  hiddenNodeIds: Set<string>;
}>();

const emit = defineEmits<{
  selectPart: [part: ModelPart];
  toggleNodeVisibility: [id: string];
}>();

const rootRef = ref<HTMLElement | null>(null);

const partById = computed(
  () => new Map(props.parts.map((part) => [part.id, part])),
);

const parentById = computed(() => {
  const map = new Map<string, string | null>();
  const walk = (nodes: PartNode[], parent: string | null) => {
    for (const node of nodes) {
      map.set(node.id, parent);
      walk(node.children, node.id);
    }
  };
  walk(props.tree, null);
  return map;
});

const ctx = reactive<PartsTreeContext>({
  expanded: new Set<string>(),
  hiddenNodeIds: props.hiddenNodeIds,
  selectedId: null,
  focusedId: null,
  entryId: null,
  toggleExpand(id) {
    const next = new Set(ctx.expanded);
    if (!next.delete(id)) next.add(id);
    ctx.expanded = next;
  },
  selectNode(id) {
    const part = partById.value.get(id);
    if (part) emit("selectPart", part);
  },
  toggleVisibility(id) {
    emit("toggleNodeVisibility", id);
  },
  setFocused(id) {
    ctx.focusedId = id;
  },
});
provide(partsTreeKey, ctx);

watch(
  () => props.hiddenNodeIds,
  (value) => {
    ctx.hiddenNodeIds = value;
  },
);

/**
 * Сразу после загрузки раскрываем верхний уровень и цепочки из единственного
 * потомка (у моделей из Sketchfab это обычно Sketchfab_model → Root), чтобы
 * пользователь не видел одну свёрнутую строку.
 */
watch(
  () => props.tree,
  (tree) => {
    const next = new Set<string>();
    for (const top of tree) {
      let node: PartNode | undefined = top;
      while (node && node.children.length > 0) {
        next.add(node.id);
        node = node.children.length === 1 ? node.children[0] : undefined;
      }
    }
    ctx.expanded = next;
    ctx.focusedId = null;
    ctx.entryId = tree[0]?.id ?? null;
  },
  { immediate: true },
);

/** Выбор с 3D-сцены: раскрыть предков и прокрутить к строке. */
watch(
  () => props.selectedPart,
  async (part) => {
    ctx.selectedId = part?.id ?? null;
    if (!part) return;
    const next = new Set(ctx.expanded);
    for (let cur = parentById.value.get(part.id); cur; cur = parentById.value.get(cur)) {
      next.add(cur);
    }
    ctx.expanded = next;
    await nextTick();
    rootRef.value
      ?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(part.id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  },
  { immediate: true },
);
</script>

<style>
.parts-tree {
  max-height: 400px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  padding: 4px 0;
  font-size: 13px;
  user-select: none;
}

.parts-tree-empty {
  margin: 8px 12px;
  color: #888;
}

@media (max-width: 768px) {
  .parts-tree {
    max-height: none;
  }
}
</style>

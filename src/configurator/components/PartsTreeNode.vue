<template>
  <div class="pt-node">
    <div
      class="pt-row"
      :class="{
        selected: ctx.selectedId === node.id,
        hidden: ownHidden || ancestorHidden,
        mesh: node.isMesh,
      }"
      :style="{ paddingLeft: `${4 + depth * 16}px` }"
      role="treeitem"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-selected="ctx.selectedId === node.id"
      :aria-level="depth + 1"
      :tabindex="isTabStop ? 0 : -1"
      :data-node-id="node.id"
      :data-parent-id="parentId ?? ''"
      :title="node.name"
      @click="onRowClick"
      @keydown="onKeydown"
      @focus="ctx.setFocused(node.id)"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="pt-twisty"
        tabindex="-1"
        aria-hidden="true"
        @click.stop="ctx.toggleExpand(node.id)"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" :class="{ open: isExpanded }">
          <path d="M5 3l6 5-6 5z" fill="currentColor" />
        </svg>
      </button>
      <span v-else class="pt-twisty pt-twisty--empty" aria-hidden="true"></span>

      <!-- Иконка одна для всех узлов: тип в иерархии не различаем -->
      <svg class="pt-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M8 1.5l5.5 3v7L8 14.5l-5.5-3v-7z M2.5 4.5L8 7.5l5.5-3 M8 7.5v7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>

      <span class="pt-name">{{ node.name }}</span>

      <button
        type="button"
        class="pt-eye"
        tabindex="-1"
        :aria-label="ownHidden ? `Показать ${node.name}` : `Скрыть ${node.name}`"
        :title="ownHidden ? 'Показать' : 'Скрыть'"
        @click.stop="ctx.toggleVisibility(node.id)"
      >
        <svg v-if="!ownHidden" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8z"
            fill="none" stroke="currentColor" stroke-width="1.2"
          />
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
        </svg>
        <svg v-else viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8z"
            fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"
          />
          <path d="M2.5 13.5l11-11" stroke="currentColor" stroke-width="1.4" />
        </svg>
      </button>
    </div>

    <div v-if="hasChildren && isExpanded" role="group">
      <PartsTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :parent-id="node.id"
        :ancestor-hidden="ownHidden || ancestorHidden"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import type { PartNode } from "../types/models";
import { partsTreeKey } from "./partsTreeContext";

const props = defineProps<{
  node: PartNode;
  depth: number;
  parentId: string | null;
  ancestorHidden: boolean;
}>();

const ctx = inject(partsTreeKey)!;

const hasChildren = computed(() => props.node.children.length > 0);
const isExpanded = computed(() => ctx.expanded.has(props.node.id));
const ownHidden = computed(() => ctx.hiddenNodeIds.has(props.node.id));

// Roving tabindex: в дерево заходим одним Tab, дальше — стрелками.
// Пока фокус не ставили, точкой входа служит выбранная деталь или первый узел.
const isTabStop = computed(
  () => (ctx.focusedId ?? ctx.selectedId ?? ctx.entryId) === props.node.id,
);

function onRowClick() {
  if (props.node.isMesh) ctx.selectNode(props.node.id);
  else if (hasChildren.value) ctx.toggleExpand(props.node.id);
}

function rows(el: HTMLElement): HTMLElement[] {
  const tree = el.closest(".parts-tree");
  return tree ? Array.from(tree.querySelectorAll<HTMLElement>(".pt-row")) : [];
}

function onKeydown(event: KeyboardEvent) {
  const el = event.currentTarget as HTMLElement;
  const list = rows(el);
  const index = list.indexOf(el);
  const focusRow = (row?: HTMLElement) => {
    if (row) {
      event.preventDefault();
      row.focus();
    }
  };

  switch (event.key) {
    case "ArrowDown":
      focusRow(list[index + 1]);
      break;
    case "ArrowUp":
      focusRow(list[index - 1]);
      break;
    case "ArrowRight":
      if (hasChildren.value && !isExpanded.value) {
        event.preventDefault();
        ctx.toggleExpand(props.node.id);
      } else if (hasChildren.value) {
        focusRow(list[index + 1]);
      }
      break;
    case "ArrowLeft":
      if (hasChildren.value && isExpanded.value) {
        event.preventDefault();
        ctx.toggleExpand(props.node.id);
      } else if (props.parentId) {
        focusRow(
          list.find((row) => row.dataset.nodeId === props.parentId),
        );
      }
      break;
    case "Enter":
    case " ":
      event.preventDefault();
      onRowClick();
      break;
    case "h":
    case "H":
      event.preventDefault();
      ctx.toggleVisibility(props.node.id);
      break;
    default:
      break;
  }
}
</script>

<style>
.pt-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding-right: 6px;
  cursor: pointer;
  color: #333;
}

.pt-row:hover {
  background: #f3f6fa;
}

.pt-row.selected {
  background: #dcebfb;
}

.pt-row:focus-visible {
  outline: 2px solid #4a90e2;
  outline-offset: -2px;
}

.pt-row.hidden {
  color: #999;
}

.pt-row.hidden .pt-name,
.pt-row.hidden .pt-icon {
  opacity: 0.55;
}

.pt-twisty {
  flex: 0 0 16px;
  width: 16px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #666;
  cursor: pointer;
}

.pt-twisty--empty {
  cursor: default;
}

.pt-twisty svg {
  transition: transform 0.12s;
}

.pt-twisty svg.open {
  transform: rotate(90deg);
}

.pt-icon {
  flex: 0 0 auto;
  color: #d97a1f;
}

.pt-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-eye {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #555;
  cursor: pointer;
}

.pt-eye:hover {
  background: rgba(74, 144, 226, 0.15);
  color: #4a90e2;
}
</style>

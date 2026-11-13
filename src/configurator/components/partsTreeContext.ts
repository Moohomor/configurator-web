import type { InjectionKey } from "vue";

/** Общее состояние дерева деталей: его читают все строки PartsTreeNode. */
export interface PartsTreeContext {
  expanded: Set<string>;
  hiddenNodeIds: Set<string>;
  selectedId: string | null;
  focusedId: string | null;
  /** Строка, в которую попадает Tab, пока фокус в дереве не ставили. */
  entryId: string | null;
  toggleExpand: (id: string) => void;
  selectNode: (id: string) => void;
  toggleVisibility: (id: string) => void;
  setFocused: (id: string) => void;
}

export const partsTreeKey: InjectionKey<PartsTreeContext> = Symbol("partsTree");

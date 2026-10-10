<template>
  <button
    class="base-button"
    :class="[`button-${variant}`, { 'button-small': small }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span v-if="icon" class="material-icons button-icon">{{ icon }}</span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: string;
  small?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  small: false,
  disabled: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style>
.base-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border: 1px solid transparent;
  white-space: nowrap;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-small {
  padding: 6px 12px;
  font-size: 12px;
}

.button-icon {
  font-size: 18px;
}

.button-small .button-icon {
  font-size: 16px;
}

/* Primary variant */
.button-primary {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.button-primary:hover:not(:disabled) {
  background: #357abd;
  border-color: #357abd;
}

/* Secondary variant */
.button-secondary {
  background: white;
  color: #666;
  border-color: #ddd;
}

.button-secondary:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #4a90e2;
  color: #4a90e2;
}

/* Danger variant */
.button-danger {
  background: white;
  color: #666;
  border-color: #ddd;
}

.button-danger:hover:not(:disabled) {
  background: #fff5f5;
  border-color: #ef5350;
  color: #ef5350;
}

/* Ghost variant */
.button-ghost {
  background: transparent;
  color: #666;
  border-color: transparent;
}

.button-ghost:hover:not(:disabled) {
  background: #f8f9fa;
  color: #4a90e2;
}

.base-button:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .base-button {
    min-height: 44px;
    padding: 10px 18px;
    font-size: 15px;
  }

  .button-small {
    min-height: 44px;
    padding: 8px 14px;
    font-size: 13px;
  }
}
</style>

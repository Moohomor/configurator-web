<template>
  <div
    v-if="hasAnimations"
    class="animation-controls"
    :class="{ 'animation-controls--pill': !expanded }"
  >
    <!-- Свёрнутый вид: только кнопка пуска и стрелка «развернуть» -->
    <div v-if="!expanded" class="pill">
      <button
        type="button"
        class="play-pause-btn"
        @click="togglePlayPause"
        :aria-label="isPlaying ? 'Пауза' : 'Воспроизвести'"
        :title="isPlaying ? 'Пауза' : 'Воспроизвести'"
      >
        <svg v-if="!isPlaying" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      </button>
      <span class="pill-divider" aria-hidden="true"></span>
      <button
        type="button"
        class="pill-expand"
        @click="emit('toggle-expanded')"
        aria-label="Развернуть плашку анимации"
        title="Развернуть"
        :aria-expanded="false"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
        </svg>
      </button>
    </div>

    <div v-if="expanded" class="controls-header">
      <h3>Анимация</h3>
      <!-- Свернуть плашку -->
      <button
        type="button"
        class="collapse-btn"
        @click="emit('toggle-expanded')"
        aria-label="Свернуть плашку анимации"
        title="Свернуть"
        :aria-expanded="true"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </button>
    </div>

    <div v-if="expanded" class="controls-body">
      <!-- Play/Pause Button -->
      <button
        class="play-pause-btn"
        @click="togglePlayPause"
        :aria-label="isPlaying ? 'Пауза' : 'Воспроизвести'"
        :title="isPlaying ? 'Пауза' : 'Воспроизвести'"
      >
        <svg v-if="!isPlaying" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      </button>

      <!-- Progress Bar -->
      <div class="progress-container">
        <input
          type="range"
          class="progress-bar"
          :value="progress"
          @input="onProgressChange"
          min="0"
          max="100"
          step="0.1"
          aria-label="Прогресс анимации"
          :aria-valuenow="progress"
          :aria-valuemin="0"
          :aria-valuemax="100"
        />
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- Speed Control: список раскрывается вверх -->
      <div class="speed-control">
        <label id="animation-speed-label">Скорость:</label>
        <div class="speed-dropdown" ref="speedRoot">
          <button
            type="button"
            class="speed-trigger"
            aria-haspopup="listbox"
            :aria-expanded="speedOpen"
            aria-labelledby="animation-speed-label"
            @click="speedOpen = !speedOpen"
            @keydown.esc="speedOpen = false"
          >
            <span>{{ playbackSpeed }}x</span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
            </svg>
          </button>
          <ul
            v-if="speedOpen"
            class="speed-menu"
            role="listbox"
            aria-labelledby="animation-speed-label"
          >
            <li v-for="s in speedOptions" :key="s" role="presentation">
              <button
                type="button"
                role="option"
                class="speed-option"
                :class="{ 'speed-option--active': s === playbackSpeed }"
                :aria-selected="s === playbackSpeed"
                @click="selectSpeed(s)"
                @keydown.esc="speedOpen = false"
              >
                {{ s }}x
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Loop Control -->
      <div class="loop-control">
        <label>
          <input type="checkbox" v-model="loop" @change="onLoopChange" />
          Повтор
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// Интерфейс входных параметров компонента
interface Props {
  hasAnimations?: boolean; // Есть ли анимации в модели
  isPlaying?: boolean; // Воспроизводится ли анимация
  currentTime?: number; // Текущее время анимации в секундах
  duration?: number; // Общая длительность анимации в секундах
  loop?: boolean; // Повторять ли анимацию
  playbackSpeed?: number; // Скорость воспроизведения
  expanded?: boolean; // Развёрнута ли плашка (на десктопе свёрнутая — компактная полоса)
}

// Интерфейс событий компонента
interface Emits {
  (e: 'play'): void; // Событие начала воспроизведения
  (e: 'pause'): void; // Событие паузы
  (e: 'seek', time: number): void; // Событие перемотки на указанное время
  (e: 'speed-change', speed: number): void; // Событие изменения скорости
  (e: 'loop-change', loop: boolean): void; // Событие изменения режима повтора
  (e: 'toggle-expanded'): void; // Запрос свернуть/развернуть плашку
  (e: 'update:isPlaying', value: boolean): void; // Обновление состояния воспроизведения
  (e: 'update:loop', value: boolean): void; // Обновление состояния повтора
  (e: 'update:playbackSpeed', value: number): void; // Обновление скорости воспроизведения
}

const props = withDefaults(defineProps<Props>(), {
  hasAnimations: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loop: true,
  playbackSpeed: 1,
  expanded: true,
});

const emit = defineEmits<Emits>();

// Вычисляемый прогресс анимации в процентах (0-100)
const progress = computed(() => {
  if (props.duration === 0) return 0;
  return (props.currentTime / props.duration) * 100;
});

// Локальное состояние для скорости и повтора
const playbackSpeed = ref(props.playbackSpeed);
const loop = ref(props.loop);

// Отслеживание изменений входных параметров
watch(
  () => props.playbackSpeed,
  (newSpeed) => {
    playbackSpeed.value = newSpeed;
  },
);

watch(
  () => props.loop,
  (newLoop) => {
    loop.value = newLoop;
  },
);

// Переключение между воспроизведением и паузой
const togglePlayPause = () => {
  if (props.isPlaying) {
    emit('pause');
    emit('update:isPlaying', false);
  } else {
    emit('play');
    emit('update:isPlaying', true);
  }
};

// Обработка изменения позиции на полосе прокрутки
const onProgressChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const newProgress = parseFloat(target.value);
  const newTime = (newProgress / 100) * props.duration;
  emit('seek', newTime);
};

// Обработка изменения скорости воспроизведения
const onSpeedChange = () => {
  emit('speed-change', playbackSpeed.value);
  emit('update:playbackSpeed', playbackSpeed.value);
};

// Выбор скорости: собственный список (нативный select раскрывается вниз)
const speedOptions = [0.25, 0.5, 1, 1.5, 2];
const speedOpen = ref(false);
const speedRoot = ref<HTMLElement | null>(null);

const selectSpeed = (value: number) => {
  playbackSpeed.value = value;
  onSpeedChange();
  speedOpen.value = false;
};

// Закрываем список при клике вне него
const onDocumentPointerDown = (event: Event) => {
  if (speedRoot.value && !speedRoot.value.contains(event.target as Node)) {
    speedOpen.value = false;
  }
};

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() =>
  document.removeEventListener('pointerdown', onDocumentPointerDown),
);

// Обработка изменения режима повтора
const onLoopChange = () => {
  emit('loop-change', loop.value);
  emit('update:loop', loop.value);
};

// Форматирование времени в формат MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.animation-controls {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls-header {
  margin-bottom: 16px;
}

.controls-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.controls-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.play-pause-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #4a90e2;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  align-self: center;
}

.play-pause-btn:hover {
  background: #357abd;
  transform: scale(1.05);
}

.play-pause-btn:active {
  transform: scale(0.95);
}

.play-pause-btn svg {
  pointer-events: none;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  cursor: pointer;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  transition: all 0.2s;
}

.progress-bar::-webkit-slider-thumb:hover {
  background: #357abd;
  transform: scale(1.2);
}

.progress-bar::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.progress-bar::-moz-range-thumb:hover {
  background: #357abd;
  transform: scale(1.2);
}

.time-display {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-control label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.speed-dropdown {
  position: relative;
  flex: 1;
}

.speed-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  background: white;
  cursor: pointer;
}

.speed-trigger:focus-visible {
  outline: none;
  border-color: #4a90e2;
}

.speed-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 5;
}

.speed-option {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  text-align: left;
  cursor: pointer;
}

.speed-option:hover,
.speed-option:focus-visible {
  background: #eef5ff;
  outline: none;
}

.speed-option--active {
  color: #4a90e2;
  font-weight: 600;
}

.loop-control {
  display: flex;
  align-items: center;
}

.loop-control label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  user-select: none;
}

.loop-control input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4a90e2;
}

.play-pause-btn:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 3px;
}

.progress-bar:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
}

.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: #eee;
}

.collapse-btn:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
}

/* Свёрнутый вид: пилюля из кнопки пуска и стрелки */
.animation-controls.animation-controls--pill {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
}

.pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  border-radius: 999px;
  padding: 4px 8px 4px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.pill .play-pause-btn {
  width: 44px;
  height: 44px;
}

.pill .play-pause-btn svg {
  width: 24px;
  height: 24px;
}

.pill-divider {
  width: 1px;
  height: 22px;
  background: #ddd;
}

.pill-expand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.pill-expand:hover {
  background: #eee;
}

.pill-expand:focus-visible {
  outline: 3px solid #4a90e2;
  outline-offset: 2px;
}

/* Мобильные стили: компактная развёрнутая плашка */
@media (max-width: 768px) {
  .animation-controls {
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    padding: 10px 16px 14px;
  }

  .controls-header {
    margin-bottom: 4px;
  }

  /* Строка 1: пуск + прогресс. Строка 2: скорость + повтор */
  .controls-body {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px 12px;
  }

  .play-pause-btn {
    grid-column: 1;
    grid-row: 1;
    width: 44px;
    height: 44px;
  }

  .play-pause-btn svg {
    width: 24px;
    height: 24px;
  }

  .progress-container {
    grid-column: 2 / 4;
    grid-row: 1;
    gap: 4px;
  }

  .speed-control {
    grid-column: 1 / 3;
    grid-row: 2;
  }

  .loop-control {
    grid-column: 3;
    grid-row: 2;
  }

  /* Увеличиваем ползунок для пальцев */
  .progress-bar {
    height: 8px;
    cursor: pointer;
  }

  .progress-bar::-webkit-slider-thumb {
    width: 24px;
    height: 24px;
  }

  .progress-bar::-moz-range-thumb {
    width: 24px;
    height: 24px;
  }

  .speed-trigger {
    padding: 6px 10px;
    font-size: 15px;
    min-height: 40px;
  }

  .speed-option {
    padding: 10px 12px;
    font-size: 15px;
    min-height: 40px;
  }

  .loop-control input[type='checkbox'] {
    width: 22px;
    height: 22px;
  }

  .loop-control label {
    font-size: 15px;
    gap: 8px;
  }
}
</style>

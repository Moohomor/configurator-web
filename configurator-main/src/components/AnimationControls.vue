<template>
  <div v-if="hasAnimations" class="animation-controls">
    <div class="controls-header">
      <h3>Анимация</h3>
    </div>

    <div class="controls-body">
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

      <!-- Speed Control -->
      <div class="speed-control">
        <label for="animation-speed-select">Скорость:</label>
        <select
          id="animation-speed-select"
          v-model="playbackSpeed"
          @change="onSpeedChange"
        >
          <option :value="0.25">0.25x</option>
          <option :value="0.5">0.5x</option>
          <option :value="1">1x</option>
          <option :value="1.5">1.5x</option>
          <option :value="2">2x</option>
        </select>
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
import { computed, ref, watch } from 'vue';

// Интерфейс входных параметров компонента
interface Props {
  hasAnimations?: boolean; // Есть ли анимации в модели
  isPlaying?: boolean; // Воспроизводится ли анимация
  currentTime?: number; // Текущее время анимации в секундах
  duration?: number; // Общая длительность анимации в секундах
  loop?: boolean; // Повторять ли анимацию
  playbackSpeed?: number; // Скорость воспроизведения
}

// Интерфейс событий компонента
interface Emits {
  (e: 'play'): void; // Событие начала воспроизведения
  (e: 'pause'): void; // Событие паузы
  (e: 'seek', time: number): void; // Событие перемотки на указанное время
  (e: 'speed-change', speed: number): void; // Событие изменения скорости
  (e: 'loop-change', loop: boolean): void; // Событие изменения режима повтора
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

.speed-control select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: white;
}

.speed-control select:focus {
  outline: none;
  border-color: #4a90e2;
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

/* Мобильные стили */
@media (max-width: 768px) {
  .animation-controls {
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    padding: 16px 20px 20px;
  }

  .play-pause-btn {
    width: 56px;
    height: 56px;
  }

  .play-pause-btn svg {
    width: 28px;
    height: 28px;
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

  .speed-control select {
    padding: 10px 12px;
    font-size: 15px;
    min-height: 44px;
  }

  .loop-control input[type='checkbox'] {
    width: 22px;
    height: 22px;
  }

  .loop-control label {
    font-size: 15px;
    gap: 12px;
  }
}
</style>

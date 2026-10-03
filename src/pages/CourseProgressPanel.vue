<!-- Панель «Задания курса». Прежде это был самописный виджет, который
     course.js рисовал в DOM поверх iframe приложения и слушал события
     страницы. Теперь это обычный Vue-компонент: источник данных —
     трекер, источник событий — конфигуратор. -->
<template>
  <section
    v-if="visible"
    class="course-panel"
    :class="{ 'course-panel--collapsed': collapsed }"
    aria-label="Задания курса"
  >
    <header class="course-panel__head">
      <div class="course-panel__titles">
        <h2 class="course-panel__title">Задания курса</h2>
        <p class="course-panel__score">
          {{ score.done }} из {{ score.total }} · {{ score.score }}%
        </p>
      </div>
      <button
        class="course-panel__toggle"
        type="button"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? 'Показать задания' : 'Скрыть задания'"
        @click="collapsed = !collapsed"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            :d="collapsed ? 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z' : 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z'"
          />
        </svg>
      </button>
    </header>

    <div v-show="!collapsed" class="course-panel__body">
      <div
        class="course-panel__progress"
        role="progressbar"
        :aria-valuenow="score.score"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="course-panel__bar" :style="{ width: score.score + '%' }" />
      </div>

      <p v-if="score.completed" class="course-panel__status">
        Все обязательные задания выполнены.
      </p>
      <p v-else class="course-panel__status">
        Обязательных заданий: {{ score.done }} из {{ score.total
        }}<span v-if="score.bonusTotal">
          · дополнительных: {{ score.bonusDone }} из {{ score.bonusTotal }}</span
        >.
      </p>

      <!--
        Задания раскрыты только у текущего урока. Список заданий всех
        восьми уроков читался как «открыть модель Б», хотя её сейчас не
        видно и открыть нельзя.
      -->
      <div v-if="currentLesson" class="course-panel__lesson">
        <h3 class="course-panel__lesson-title">
          <a v-if="linksEnabled" :href="lessonHref(currentLesson.id)">{{
            currentLesson.name
          }}</a>
          <template v-else>{{ currentLesson.name }}</template>
        </h3>
        <ul class="course-panel__tasks">
          <li
            v-for="task in tracker.tasksOf(currentLesson)"
            :key="task.key"
            class="course-panel__task"
            :class="{
              'course-panel__task--done': task.done,
              'course-panel__task--bonus': !task.task.core,
            }"
          >
            <span class="course-panel__mark" aria-hidden="true">
              {{ task.done ? "✓" : "○" }}
            </span>
            <span>{{ task.task.title }}</span>
            <span class="course-panel__kind">
              {{ task.task.core ? "обязательное" : "дополнительное" }}
            </span>
          </li>
        </ul>
      </div>

      <!--
        Внутри LMS это просто список: уроки открываются из меню курса,
        и ссылки отсюда только сбивают с толку.
      -->
      <div v-if="otherLessons.length" class="course-panel__others">
        <p class="course-panel__others-title">Другие уроки курса</p>
        <ul>
          <li v-for="lesson in otherLessons" :key="lesson.id">
            <a v-if="linksEnabled" :href="lessonHref(lesson.id)">{{
              lesson.name
            }}</a>
            <template v-else>{{ lesson.name }}</template>
          </li>
        </ul>
      </div>

      <!--
    Кнопки «Завершить» здесь нет намеренно. Результат уходит в LMS сам, на
    каждое выполненное задание (LearningRuntime.report), а сессию закрывает
    LMS сама, когда обучающий уходит из урока. Ручная кнопка была вредной:
    она ставила Terminate посреди работы и замораживала учёт — задания,
    выполненные после неё, уже не попадали в отчёт.
  -->
      <footer class="course-panel__foot">
        <p class="course-panel__runtime">{{ runtimeLabel }}</p>
        <p class="course-panel__note">
          Результат сохраняется автоматически при каждом выполненном задании.
        </p>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { currentLessonId, lessonHref, onRouteChange } from "@/scorm/lesson";
import type { LessonTracker } from "@/scorm/tracker";

const props = defineProps<{
  tracker: LessonTracker;
  runtimeLabel: string;
  /** Внутри LMS переходы в уроки выключены — см. App.vue. */
  linksEnabled?: boolean;
}>();

const visible = ref(true);
const collapsed = ref(false);

const score = props.tracker.score;

const lessons = props.tracker.lessons;

/** Урок, открытый прямо сейчас: его задания и разворачиваем. */
const currentLesson = computed(() => {
  const id = currentLessonId();
  return id ? lessons.find((lesson) => lesson.id === id) ?? null : null;
});

/** Остальные уроки — только ссылками, без чужих заданий. */
const otherLessons = computed(() =>
  lessons.filter((lesson) => lesson.id !== currentLesson.value?.id),
);

// Панель живёт дольше, чем страница: переходы «каталог ↔ урок» её не
// пересоздают. Сворачиваем её на уроке — там полоса с заданиями мешает
// смотреть модель, — и разворачиваем в каталоге.
function syncCollapsed(): void {
  collapsed.value = currentLessonId() !== null;
}

onMounted(syncCollapsed);
onBeforeUnmount(onRouteChange(syncCollapsed));
</script>

<style scoped>
.course-panel {
  /* На уроке панель лежит поверх 3D-сцены и по умолчанию свёрнута.
     В каталоге её раскладывает .app--catalog (grid-колонка справа). */
  position: fixed;
  top: 16px;
  right: 16px;
  width: 300px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  font-size: 14px;
  color: #1a1a1a;
  z-index: 200;
  overflow: hidden;
}

/* В каталоге панель не накладывается на галерею, а занимает свою
   колонку: наложение перекрывало бы вкладки категорий и карточки. */
.course-panel--inline {
  position: static;
  margin: 0;
  width: auto;
  max-width: none;
}

.course-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #00364a;
  color: #fff;
}

.course-panel__titles {
  flex: 1;
  min-width: 0;
}

.course-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.course-panel__score {
  margin: 2px 0 0;
  font-size: 12px;
  opacity: 0.8;
}

.course-panel__toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
}

.course-panel__toggle:hover {
  background: rgba(255, 255, 255, 0.15);
}

.course-panel__body {
  max-height: min(70vh, 560px);
  overflow-y: auto;
  padding: 12px 14px 14px;
}

.course-panel__progress {
  height: 6px;
  background: #e6e6e6;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.course-panel__bar {
  height: 100%;
  background: #00a4cf;
  transition: width 0.25s ease;
}

.course-panel__status {
  margin: 0 0 12px;
  font-size: 12px;
  color: #555;
}

.course-panel__lesson {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #eee;
}

.course-panel__lesson-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
}

.course-panel__lesson-title a {
  color: #00364a;
  text-decoration: none;
}

.course-panel__lesson-title a:hover {
  text-decoration: underline;
}

.course-panel__tasks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.course-panel__task {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #444;
  font-size: 13px;
}

.course-panel__task--done {
  color: #1f9d55;
}

.course-panel__mark {
  font-weight: 700;
}

.course-panel__kind {
  margin-left: auto;
  font-size: 11px;
  color: #8a8a8a;
  white-space: nowrap;
}

.course-panel__others {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.course-panel__others-title {
  margin: 0 0 6px;
  font-size: 12px;
  color: #8a8a8a;
}

.course-panel__others ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.course-panel__others a {
  font-size: 13px;
  color: #00364a;
  text-decoration: none;
}

.course-panel__others a:hover {
  text-decoration: underline;
}

.course-panel__foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.course-panel__runtime {
  margin: 0 0 8px;
  font-size: 11px;
  color: #8a8a8a;
}

.course-panel__finish {
  width: 100%;
  padding: 8px 12px;
  background: #00a4cf;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.course-panel__finish:hover {
  background: #0089ae;
}

.course-panel__reported {
  margin: 0;
  font-size: 12px;
  color: #1f9d55;
}

@media (max-width: 768px) {
  .course-panel {
    top: 8px;
    right: 8px;
    left: 8px;
    width: auto;
    max-width: none;
  }

  .course-panel--inline {
    left: auto;
    right: auto;
    width: auto;
    max-width: none;
  }

  .course-panel__body {
    max-height: 50vh;
  }
}
</style>

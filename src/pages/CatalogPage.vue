<!-- Каталог моделей (галерея). Отдельная HTML-точка входа не нужна:
     это index.html без параметра ?lesson= и SCO, открытый как каталог. -->
<template>
  <div class="catalog">
    <header class="catalog-header">
      <h1 class="catalog-title">Подвижной состав</h1>
      <p class="catalog-lead">
        Выберите модель — откроется отдельный урок, к нему можно вернуться
        по прямой ссылке из меню курса.
      </p>
    </header>

    <ModelSelector
      :models="models"
      :completed-ids="completedIds"
      @select="openLesson"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ModelSelector from "@/catalog/ModelSelector.vue";
import type { Model } from "@/configurator/types/models";
import { goToLesson } from "@/scorm/lesson";
import type { LessonTracker } from "@/scorm/tracker";
import { lessonsOf } from "@/scorm/lessons";

const props = defineProps<{
  models: Model[];
  tracker: LessonTracker;
}>();

/** Уроки, по которым закрыты все обязательные задания. */
const completedIds = computed(() =>
  lessonsOf(props.models)
    .filter((lesson) => {
      const tasks = props.tracker.tasksOf(lesson);
      const core = tasks.filter((task) => task.task.core);
      return core.length > 0 && core.every((task) => task.done);
    })
    .map((lesson) => lesson.id),
);

function openLesson(model: Model): void {
  goToLesson(model.id);
}
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.catalog-header {
  padding: 40px 32px 20px;
  color: #1a1a1a;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    Cantarell, sans-serif;
}

.catalog-title {
  margin: 0 0 10px;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.catalog-lead {
  margin: 0;
  max-width: 60ch;
  font-size: 15px;
  line-height: 1.5;
  color: #555;
}

@media (max-width: 768px) {
  .catalog-header {
    padding: 24px 16px 14px;
  }

  .catalog-title {
    font-size: 24px;
  }
}
</style>

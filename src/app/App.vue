<!-- Корневой компонент: решает, что показать — каталог или урок, и
     собирает трекер. Приложение целиком живёт в документе страницы,
     без собственного iframe. -->
<template>
  <div class="app" :class="`app--${view}`">
    <p v-if="loadError" class="app__message">{{ loadError }}</p>
    <p v-else-if="!tracker" class="app__message">Загрузка каталога моделей…</p>
    <template v-else>
      <LessonPage v-if="model" :key="model.id" :model="model" :tracker="tracker" />
      <CatalogPage v-else :models="models" :tracker="tracker" />
      <CourseProgressPanel
        :class="{ 'course-panel--inline': view === 'catalog' }"
        :tracker="tracker"
        :runtime-label="runtime.label"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import CatalogPage from "@/pages/CatalogPage.vue";
import CourseProgressPanel from "@/pages/CourseProgressPanel.vue";
import LessonPage from "@/pages/LessonPage.vue";
import type { LearningRuntime, ModelCatalogSource } from "@/api/types";
import type { Model } from "@/configurator/types/models";
import { currentLessonId, currentScope, onRouteChange } from "@/scorm/lesson";
import { lessonsOf } from "@/scorm/lessons";
import { createTracker, type LessonTracker } from "@/scorm/tracker";

const props = defineProps<{
  catalog: ModelCatalogSource;
  runtime: LearningRuntime;
  /** id урока, заданный при запуске SCO; null — открыть каталог. */
  lessonId: string | null;
}>();

const models = ref<Model[]>([]);
const lessonId = ref<string | null>(props.lessonId);
const tracker = shallowRef<LessonTracker | null>(null);
const loadError = ref<string | null>(null);

/**
 * Урок = модель с настоящей 3D-моделью. Заглушки каталога уроками не
 * являются: открывать их как урок нельзя, у них нет `path`, и загрузчик
 * сцены падает на `undefined`. Поэтому поиск идёт по списку уроков, а не
 * по всем моделям, и битая ссылка молча открывает каталог.
 */
const model = computed<Model | null>(() => {
  if (!lessonId.value) return null;
  return (
    lessons.value.find((lesson) => lesson.id === lessonId.value) ?? null
  );
});

const view = computed(() => (model.value ? "lesson" : "catalog"));

/** Все уроки каталога (модели с 3D). */
const lessons = computed(() => lessonsOf(models.value));

onMounted(async () => {
  try {
    models.value = await props.catalog.load();
    // Граница ответственности SCO определяется при запуске: открыт SCO
    // как отдельный урок (lesson-<id>.html) — отвечает за него, открыт как
    // каталог — за весь курс.
    tracker.value = createTracker({
      runtime: props.runtime,
      lessons: lessons.value,
      scope: currentScope(),
    });
  } catch (error) {
    loadError.value =
      error instanceof Error ? error.message : "Не удалось загрузить каталог";
    console.error("[каталог] загрузка не удалась", error);
  }
});

// Переходы «каталог ↔ урок» не перезагружают страницу: перезагрузка SCO
// означала бы второй Initialize в одной сессии LMS.
onBeforeUnmount(
  onRouteChange(() => {
    lessonId.value = currentLessonId();
  }),
);

watch(
  model,
  (next) => {
    document.title = next
      ? `${next.name} — 3D-конфигуратор`
      : "3D-конфигуратор подвижного состава";
  },
  { immediate: true },
);
</script>

<style>
html,
body,
#app {
  height: 100%;
}

body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1a1a1a;
}

/*
 * Каталог: две колонки — галерея и колонка заданий справа. Панель в потоке,
 * а не поверх: наложение перекрывало бы вкладки категорий и карточки.
 * Урок: одна колонка, панель наезжает на сцену и по умолчанию свёрнута.
 */
.app {
  height: 100%;
}

.app--catalog {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 332px;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
}

.app--catalog > .catalog {
  overflow-y: auto;
}

.app--catalog > .course-panel {
  border-left: 1px solid #e2e2e2;
  border-radius: 0;
  box-shadow: none;
  overflow-y: auto;
}

.app--lesson {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app__message {
  padding: 40px 32px;
  color: #555;
}

/* На узком экране колонка заданий встаёт над галереей. */
@media (max-width: 900px) {
  .app--catalog {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    overflow-y: auto;
  }

  .app--catalog > .course-panel {
    border-left: none;
    border-bottom: 1px solid #e2e2e2;
    overflow-y: visible;
  }
}
</style>

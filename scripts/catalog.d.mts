export interface LessonEntry {
  id: string;
  name: string;
}

/** Урок = модель с реальной 3D-моделью (`path`); остальное — заглушки. */
export function readLessons(catalogPath: string): LessonEntry[];

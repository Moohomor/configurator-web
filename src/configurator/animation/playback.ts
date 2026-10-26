import type { AnimationClip } from "three";

/**
 * В glTF «анимацией» иногда оказывается одна статичная поза: длительность
 * ~1/30 с, бегунок проскакивает, а модель не двигается. Показывать такое
 * как воспроизведение нельзя.
 *
 * Заодно отбрасываем треки с несколькими ключами, у которых значения не
 * меняются: экспортёры иногда дублируют одну и ту же позу на разных
 * отметках времени.
 */
export function isPlayableClip(clip: AnimationClip): boolean {
  if (!Number.isFinite(clip.duration) || clip.duration <= 0) return false;

  return clip.tracks.some((track) => {
    const { times, values } = track;
    if (times.length < 2 || times[times.length - 1]! <= times[0]!) {
      return false;
    }

    const stride = track.getValueSize();
    if (stride <= 0) return false;

    // Движение есть только там, где меняется хотя бы одно значение ключа.
    for (let frame = 1; frame < times.length; frame++) {
      for (let component = 0; component < stride; component++) {
        if (Math.abs(values[frame * stride + component]! - values[component]!) > 1e-6) {
          return true;
        }
      }
    }
    return false;
  });
}

export function clampAnimationTime(time: number, duration: number): number {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(time, duration));
}

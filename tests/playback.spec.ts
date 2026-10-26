import { expect, test } from "@playwright/test";
import type { AnimationClip } from "three";
import {
  clampAnimationTime,
  isPlayableClip,
} from "../src/configurator/animation/playback";

/**
 * Чистые функции плеера. Идут тем же `npm test`, что и SCORM-сценарии,
 * но браузер не поднимают: страница им не нужна.
 *
 * Отдельный node:test не подключаем: файл с типами требует
 * `--experimental-strip-types` (Node 22.6+), а CI и пакет живут на Node 20.
 */
function makeClip(times: number[], values: number[]): AnimationClip {
  const last = times[times.length - 1] ?? 0;
  return {
    duration: last,
    tracks: [
      {
        times: Float32Array.from(times),
        values: Float32Array.from(values),
        getValueSize: () => 1,
      },
    ],
  } as unknown as AnimationClip;
}

test.describe("плеер анимации", () => {
  test("одиночная статичная поза не считается анимацией", () => {
    expect(isPlayableClip(makeClip([1 / 30], [4]))).toBe(false);
  });

  test("повторяющиеся одинаковые позы не playable", () => {
    expect(isPlayableClip(makeClip([0, 1, 2], [4, 4, 4]))).toBe(false);
  });

  test("клип, в котором поза меняется, playable", () => {
    expect(isPlayableClip(makeClip([0, 0.5, 2], [4, 5, 4]))).toBe(true);
  });

  test("клип с нулевой или невалидной длительностью отклоняется", () => {
    expect(
      isPlayableClip({ duration: 0, tracks: [] } as unknown as AnimationClip),
    ).toBe(false);
    expect(
      isPlayableClip({ duration: NaN, tracks: [] } as unknown as AnimationClip),
    ).toBe(false);
  });

  test("время перемотки зажимается в границы клипа", () => {
    expect(clampAnimationTime(2.1, 2)).toBe(2);
    expect(clampAnimationTime(-0.3, 2)).toBe(0);
    expect(clampAnimationTime(0.75, 2)).toBe(0.75);
    expect(clampAnimationTime(NaN, 2)).toBe(0);
    expect(clampAnimationTime(1, 0)).toBe(0);
  });
});

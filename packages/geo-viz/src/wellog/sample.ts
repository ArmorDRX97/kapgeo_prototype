import type { CurveSamples } from './types';

/**
 * Index of the last sample at or before `depth` in an ascending `depths`
 * array, via binary search. Returns -1 when `depth` is above the first sample.
 */
export function findSampleIndex(depths: ArrayLike<number>, depth: number): number {
  let low = 0;
  let high = depths.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const value = depths[mid];
    if (value === undefined || value > depth) {
      high = mid - 1;
    } else {
      result = mid;
      low = mid + 1;
    }
  }
  return result;
}

/**
 * Linearly interpolated curve value at `depth`, or `undefined` outside the
 * sampled interval or across a gap (`NaN` sample).
 */
export function valueAtDepth(samples: CurveSamples, depth: number): number | undefined {
  const { depths, values } = samples;
  const n = Math.min(depths.length, values.length);
  if (n === 0) return undefined;

  const i = findSampleIndex(depths, depth);
  if (i < 0 || i >= n) return undefined;

  const d0 = depths[i];
  const v0 = values[i];
  if (d0 === undefined || v0 === undefined || Number.isNaN(v0)) return undefined;
  if (d0 === depth || i === n - 1) return d0 === depth ? v0 : undefined;

  const d1 = depths[i + 1];
  const v1 = values[i + 1];
  if (d1 === undefined || v1 === undefined || !Number.isFinite(v1)) return undefined;
  if (d1 === d0) return v0;

  const t = (depth - d0) / (d1 - d0);
  return v0 + (v1 - v0) * t;
}

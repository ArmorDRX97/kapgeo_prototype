import type { CurveSamples } from './types';

/** Min/max reduction of finite runs; explicit gaps survive reduction. */
export function decimate(samples: CurveSamples, buckets: number, start = 0,
  end = Math.min(samples.depths.length, samples.values.length)): CurveSamples {
  const n = Math.min(samples.depths.length, samples.values.length);
  const lo = Math.max(0, Math.min(Math.trunc(start), n));
  const hi = Math.max(lo, Math.min(Math.trunc(end), n));
  const count = hi - lo;
  const bucketCount = Math.max(1, Math.trunc(buckets));
  const depths: number[] = [], values: number[] = [];
  const append = (i: number) => {
    depths.push(samples.depths[i] ?? Number.NaN); values.push(samples.values[i] ?? Number.NaN);
  };
  let i = lo;
  while (i < hi) {
    if (!Number.isFinite(samples.values[i]) || !Number.isFinite(samples.depths[i])) {
      depths.push(samples.depths[i] ?? Number.NaN); values.push(Number.NaN);
      do { i++; } while (i < hi && (!Number.isFinite(samples.values[i]) || !Number.isFinite(samples.depths[i])));
      continue;
    }
    const runStart = i;
    while (i < hi && Number.isFinite(samples.values[i]) && Number.isFinite(samples.depths[i])) i++;
    const runEnd = i, runCount = runEnd - runStart;
    const runBuckets = Math.max(1, Math.floor(bucketCount * runCount / Math.max(1, count)));
    if (runCount <= runBuckets * 2) {
      for (let j = runStart; j < runEnd; j++) append(j);
      continue;
    }
    append(runStart);
    for (let b = 0; b < runBuckets; b++) {
      const from = runStart + Math.floor(b * runCount / runBuckets);
      const to = runStart + Math.floor((b + 1) * runCount / runBuckets);
      let min = from, max = from;
      for (let j = from + 1; j < to; j++) {
        if ((samples.values[j] ?? 0) < (samples.values[min] ?? 0)) min = j;
        if ((samples.values[j] ?? 0) > (samples.values[max] ?? 0)) max = j;
      }
      append(Math.min(min, max)); if (min !== max) append(Math.max(min, max));
    }
    append(runEnd - 1);
  }
  return { depths: Float64Array.from(depths), values: Float64Array.from(values) };
}

import { scaleLinear } from 'd3-scale';
import type { ScaleLinear } from 'd3-scale';
import type { DepthRange } from './types';

/** Smallest depth window the user can zoom into, metres. */
export const MIN_DEPTH_SPAN = 0.5;

/**
 * Depth -> pixel scale for a track of `heightPx` pixels.
 * Top of the canvas is the shallow end, which is what a well log tablet shows.
 */
export function createDepthScale(range: DepthRange, heightPx: number): ScaleLinear<number, number> {
  return scaleLinear().domain([range[0], range[1]]).range([0, heightPx]);
}

/**
 * Zoom a depth window around a fixed depth.
 *
 * `zoomFactor > 1` zooms in (the window shrinks), `< 1` zooms out.
 * `centerDepth` keeps its exact pixel position, which is what makes
 * wheel-zoom-under-the-cursor feel right.
 */
export function visibleWindow(
  range: DepthRange,
  zoomFactor: number,
  centerDepth: number,
): DepthRange {
  if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) return range;
  const [from, to] = range;
  return [
    centerDepth - (centerDepth - from) / zoomFactor,
    centerDepth + (to - centerDepth) / zoomFactor,
  ];
}

/**
 * Keep a depth window inside `bounds`, preserving its span where possible and
 * never letting it become smaller than `minSpan` or larger than the bounds.
 */
export function clampRange(
  range: DepthRange,
  bounds: DepthRange,
  minSpan: number = MIN_DEPTH_SPAN,
): DepthRange {
  const lower = Math.min(bounds[0], bounds[1]);
  const upper = Math.max(bounds[0], bounds[1]);
  const boundsSpan = upper - lower;
  if (boundsSpan <= 0) return [lower, upper];

  let [from, to] = range[0] <= range[1] ? range : [range[1], range[0]];
  let span = Math.min(Math.max(to - from, Math.min(minSpan, boundsSpan)), boundsSpan);

  if (!Number.isFinite(span) || span <= 0) span = boundsSpan;
  const center = (from + to) / 2;
  from = center - span / 2;
  to = from + span;

  if (from < lower) {
    from = lower;
    to = lower + span;
  }
  if (to > upper) {
    to = upper;
    from = upper - span;
  }
  return [from, to];
}

/**
 * Depth tick values for a `px`-tall axis, spaced so labels never collide
 * (roughly one tick per 48 px).
 */
export function niceTicks(range: DepthRange, px: number): number[] {
  const count = Math.max(2, Math.floor(px / 48));
  return createDepthScale(range, Math.max(px, 1)).ticks(count);
}

import { curveColor } from '../palette';
import { decimate } from './decimate';
import { drawIntervals } from './draw-intervals';
import { createDepthScale, niceTicks } from './depth-scale';
import { findSampleIndex } from './sample';
import type { ChromeColors } from './chrome-colors';
import type { CurveScale, CurveSamples, CurveSpec, DepthRange, TrackSpec } from './types';

export type TrackDrawOptions = {
  /** CSS pixels. The canvas transform is expected to already account for DPR. */
  width: number;
  height: number;
  track: TrackSpec;
  range: DepthRange;
  colors: ChromeColors;
  /** Crosshair depth (hovered depth), if any. */
  crosshairDepth?: number | null;
};

/** Number of vertical grid divisions inside a track. */
const VERTICAL_DIVISIONS = 4;

/** Horizontal position of `value` inside a track of `width` CSS pixels. */
export function valueToX(value: number, scale: CurveScale, width: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (scale.log) {
    if (value <= 0 || scale.min <= 0 || scale.max <= 0) return undefined;
    const lo = Math.log10(scale.min);
    const hi = Math.log10(scale.max);
    if (hi === lo) return undefined;
    return clampToTrack(((Math.log10(value) - lo) / (hi - lo)) * width, width);
  }
  if (scale.max === scale.min) return undefined;
  return clampToTrack(((value - scale.min) / (scale.max - scale.min)) * width, width);
}

function clampToTrack(x: number, width: number): number {
  return Math.max(0, Math.min(width, x));
}

/** Half-open index window covering `range`, with one sample of overshoot on each side. */
export function visibleIndexRange(depths: ArrayLike<number>, range: DepthRange): [number, number] {
  const n = depths.length;
  if (n === 0) return [0, 0];
  const start = Math.max(0, findSampleIndex(depths, range[0]));
  const last = findSampleIndex(depths, range[1]);
  const end = last < 0 ? 0 : Math.min(n, last + 2);
  return [Math.min(start, end), end];
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  curve: CurveSpec,
  options: TrackDrawOptions,
): void {
  const { width, height, range } = options;
  const samples: CurveSamples = curve.data;
  const [start, end] = visibleIndexRange(samples.depths, range);
  if (end - start < 1) return;

  const points = decimate(samples, Math.max(1, Math.round(height)), start, end);
  const depthScale = createDepthScale(range, height);

  ctx.strokeStyle = curve.color ?? curveColor(curve.type);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  let open = false;
  for (let i = 0; i < points.depths.length; i += 1) {
    const depth = points.depths[i];
    const value = points.values[i];
    const x =
      depth === undefined || value === undefined ? undefined : valueToX(value, curve.scale, width);
    if (depth === undefined || x === undefined) {
      open = false;
      continue;
    }
    const y = depthScale(depth);
    if (open) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    open = true;
  }
  ctx.stroke();
}

/**
 * One well log track: background, grid, every curve. Pure: it only touches the
 * context it is given, which is what makes it testable with a recording mock.
 */
export function drawTrack(ctx: CanvasRenderingContext2D, options: TrackDrawOptions): void {
  const { width, height, track, range, colors, crosshairDepth } = options;
  if (width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  if (track.grid !== false) {
    const depthScale = createDepthScale(range, height);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const depth of niceTicks(range, height)) {
      const y = Math.round(depthScale(depth)) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    for (let i = 1; i < VERTICAL_DIVISIONS; i += 1) {
      const x = Math.round((width * i) / VERTICAL_DIVISIONS) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = colors.axis;
  if (track.intervals) drawIntervals(ctx, track.intervals, range, width, height, colors);
  for (const curve of track.curves) drawCurve(ctx, curve, options);
  const depthScale = createDepthScale(range, height);
  for (const bar of track.bars ?? []) {
    if (bar.to <= range[0] || bar.from >= range[1]) continue;
    const y = Math.max(0, depthScale(bar.from)), bottom = Math.min(height, depthScale(bar.to));
    const w = Math.min(width - 4, (width - 4) * bar.value / (track.barMax || 1));
    ctx.fillStyle = bar.fill; ctx.fillRect(1, y, w, Math.max(1, bottom - y - 1));
    if (bottom - y > 15) { ctx.fillStyle = colors.text; ctx.font = '11px Segoe UI, sans-serif'; ctx.fillText(bar.label, 4, (y + bottom) / 2 + 4); }
  }
  for (const guide of track.guides ?? []) {
    if (guide.depth !== undefined && (guide.depth < range[0] || guide.depth > range[1])) continue;
    ctx.save(); ctx.strokeStyle = guide.color; ctx.fillStyle = colors.text; ctx.font = '11px Segoe UI, sans-serif';
    if (guide.dashed) ctx.setLineDash([5, 4]); ctx.beginPath();
    if (guide.depth !== undefined) { const y = depthScale(guide.depth); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.fillText(guide.label, 4, Math.min(height - 3, Math.max(12, y - 4))); }
    else if (guide.value !== undefined && guide.scale) { const x = valueToX(guide.value, guide.scale, width); if (x !== undefined) { ctx.moveTo(x, 0); ctx.lineTo(x, height); } }
    ctx.stroke(); ctx.restore();
  }
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (crosshairDepth != null) {
    const y = Math.round(createDepthScale(range, height)(crosshairDepth)) + 0.5;
    ctx.strokeStyle = colors.crosshair;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

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
  ctx.save();
  if (curve.fill) {
    const fill = curve.fill, baseline = valueToX(fill.baseline, curve.scale, width);
    if (baseline !== undefined) {
      ctx.fillStyle = fill.color; ctx.globalAlpha = 0.18;
      for (let i = start; i < end - 1; i++) {
        const da = samples.depths[i]!, db = samples.depths[i + 1]!, va = samples.values[i]!, vb = samples.values[i + 1]!;
        if (![va, vb].every(Number.isFinite) || db <= da) continue;
        let from = Math.max(da, fill.from, range[0]), to = Math.min(db, fill.to, range[1]);
        if (to <= from || (fill.below ? Math.min(va, vb) >= fill.baseline : Math.max(va, vb) <= fill.baseline)) continue;
        if ((va < fill.baseline) !== (vb < fill.baseline)) { const contact = da + (fill.baseline - va) / (vb - va) * (db - da); if (fill.below ? va > vb : va < vb) from = Math.max(from, contact); else to = Math.min(to, contact); }
        if (to <= from) continue;
        const a = valueToX(va + (vb - va) * (from - da) / (db - da), curve.scale, width), b = valueToX(va + (vb - va) * (to - da) / (db - da), curve.scale, width);
        if (a === undefined || b === undefined) continue;
        ctx.beginPath(); ctx.moveTo(baseline, depthScale(from)); ctx.lineTo(a, depthScale(from)); ctx.lineTo(b, depthScale(to)); ctx.lineTo(baseline, depthScale(to)); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = curve.color ?? curveColor(curve.type);
  ctx.lineWidth = curve.lineWidth ?? 1;
  if (curve.dashed) ctx.setLineDash([5, 3]);
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
  if (curve.markers) {
    ctx.fillStyle = curve.color ?? curveColor(curve.type);
    const stride = Math.max(1, Math.ceil((end - start) / 300));
    for (let i = start; i < end; i += stride) {
      const depth = samples.depths[i]!, x = valueToX(samples.values[i]!, curve.scale, width);
      if (depth < range[0] || depth > range[1] || x === undefined) continue;
      ctx.beginPath(); ctx.arc(x, depthScale(depth), 2.5, 0, 2 * Math.PI); ctx.fill();
    }
  }
  ctx.restore();
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
  for (const note of track.annotations ?? []) {
    if (note.depth < range[0] || note.depth > range[1]) continue;
    ctx.save(); ctx.font = '11px Segoe UI, sans-serif';
    const y = Math.min(height - 19, Math.max(1, depthScale(note.depth) - 9)), w = Math.min(width - 8, ctx.measureText(note.text).width + 8);
    ctx.fillStyle = note.background; ctx.fillRect(4, y, w, 18); ctx.strokeStyle = note.color; ctx.lineWidth = 0.7; ctx.strokeRect(4, y, w, 18);
    ctx.beginPath(); ctx.rect(4, y, w, 18); ctx.clip(); ctx.fillStyle = note.color; ctx.fillText(note.text, 8, y + 13); ctx.restore();
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

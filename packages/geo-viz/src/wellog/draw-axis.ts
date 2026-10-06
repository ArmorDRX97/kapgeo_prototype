import { createDepthScale, niceTicks } from './depth-scale';
import type { ChromeColors } from './chrome-colors';
import type { DepthRange } from './types';

export type DepthAxisOptions = {
  /** CSS pixels. The canvas transform is expected to already account for DPR. */
  width: number;
  height: number;
  range: DepthRange;
  colors: ChromeColors;
  /** Crosshair depth (hovered depth), if any. */
  crosshairDepth?: number | null;
  font?: string;
};

const DEFAULT_FONT = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const TICK_LENGTH = 5;

/**
 * Shared depth axis, drawn once for the whole tablet. Pure: everything it
 * needs is in `options`, so it can be unit tested with a recording context.
 */
export function drawDepthAxis(ctx: CanvasRenderingContext2D, options: DepthAxisOptions): void {
  const { width, height, range, colors, crosshairDepth, font = DEFAULT_FONT } = options;
  if (width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const scale = createDepthScale(range, height);
  const ticks = niceTicks(range, height);

  ctx.strokeStyle = colors.axis;
  ctx.fillStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.font = font;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  ctx.beginPath();
  ctx.moveTo(width - 0.5, 0);
  ctx.lineTo(width - 0.5, height);
  ctx.stroke();

  for (const depth of ticks) {
    const position = scale(depth);
    if (position < 0 || position > height) continue;
    // Crisp 1px line, kept inside the canvas so the first/last label is not clipped.
    const y = Math.min(height - 0.5, Math.max(0.5, Math.round(position) + 0.5));
    ctx.beginPath();
    ctx.moveTo(width - TICK_LENGTH, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillText(String(depth), width - TICK_LENGTH - 3, Math.max(8, Math.min(height - 8, y)));
  }

  if (crosshairDepth != null) {
    const y = Math.round(scale(crosshairDepth)) + 0.5;
    ctx.strokeStyle = colors.crosshair;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

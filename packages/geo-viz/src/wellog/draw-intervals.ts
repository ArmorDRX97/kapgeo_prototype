import { createDepthScale } from './depth-scale';
import type { ChromeColors } from './chrome-colors';
import type { DepthRange, IntervalSpec } from './types';

export function drawIntervals(ctx: CanvasRenderingContext2D, intervals: IntervalSpec[],
  range: DepthRange, width: number, height: number, colors: ChromeColors): void {
  const scale = createDepthScale(range, height);
  for (const row of intervals) {
    if (row.to <= range[0] || row.from >= range[1]) continue;
    const y = Math.max(0, scale(row.from)), bottom = Math.min(height, scale(row.to));
    const h = bottom - y, x = 8, w = width - 16;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalAlpha = row.preview ? 0.55 : 0.85;
    ctx.fillStyle = row.fill; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.32; ctx.strokeStyle = colors.text; ctx.fillStyle = colors.text; ctx.lineWidth = 0.6;
    if (row.pattern === 'dots') {
      for (let py = y + 5; py < bottom; py += 9) for (let px = x + 5; px < x + w; px += 9) {
        ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (row.pattern === 'lines') {
      for (let py = y + 6; py < bottom; py += 8) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke(); }
    } else if (row.pattern === 'diagonal') {
      for (let py = y - w; py < bottom; py += 10) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py + w); ctx.stroke(); }
    }
    ctx.restore(); ctx.save();
    ctx.strokeStyle = row.selected ? colors.crosshair : colors.axis; ctx.lineWidth = row.selected ? 2.5 : 0.8;
    if (row.preview) ctx.setLineDash([5, 3]); ctx.strokeRect(x, y, w, h);
    if (row.selected) {
      ctx.fillStyle = colors.crosshair; ctx.fillRect(x + w / 2 - 4, y - 3, 8, 6); ctx.fillRect(x + w / 2 - 4, bottom - 3, 8, 6);
    }
    if (h > 26) {
      ctx.font = '12px Inter, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const text = row.label.length > 17 ? row.label.slice(0, 15) + '…' : row.label;
      const tw = Math.min(w - 6, ctx.measureText(text).width + 8);
      ctx.fillStyle = colors.background; ctx.globalAlpha = 0.88; ctx.fillRect(x + (w - tw) / 2, y + h / 2 - 10, tw, 20);
      ctx.globalAlpha = 1; ctx.fillStyle = colors.text; ctx.fillText(text, x + w / 2, y + h / 2, w - 8);
    }
    ctx.restore();
  }
}

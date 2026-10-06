import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { curveColor } from '../palette';
import { readChromeColors } from './chrome-colors';
import { clampRange, visibleWindow } from './depth-scale';
import { drawDepthAxis } from './draw-axis';
import { drawTrack } from './draw-track';
import { valueAtDepth } from './sample';
import type { DepthRange, TrackSpec, WellLogProps } from './types';

const AXIS_WIDTH = 60;
const HEADER_HEIGHT = 64;
const trackWidth = (track: TrackSpec) => track.width ?? 140;
type Gesture = { trackId: string; startDepth: number; startY: number; range: DepthRange;
  kind: 'pan' | 'range' | 'boundary' | 'select'; intervalId?: string; edge?: 'from' | 'to' };

/** Main frontend Canvas tablet, adapted for standalone styling and interval editing. */
export function WellLog({ tracks, depthRange, height = 620, className, onDepthRangeChange,
  bounds, interactionMode = 'select', onTrackSelect, onRangeSelect, onBoundaryChange,
  onTrackHeaderClick, labels = { axis: 'MD, m', depthAxis: 'Depth axis', unit: 'm', track: 'Track' } }: WellLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLCanvasElement>(null);
  const canvases = useRef(new Map<string, HTMLCanvasElement>());
  const gesture = useRef<Gesture | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ trackId: string; range: DepthRange } | null>(null);
  const [localRange, setLocalRange] = useState<DepthRange>(depthRange);
  const range = onDepthRangeChange ? depthRange : localRange;
  const plotHeight = height - HEADER_HEIGHT;
  const inferred = tracks.flatMap(t => t.curves.flatMap(c => [c.data.depths[0] ?? range[0], c.data.depths[c.data.depths.length - 1] ?? range[1]]));
  const limits: DepthRange = bounds ?? [Math.min(range[0], ...inferred), Math.max(range[1], ...inferred)];
  const commit = (next: DepthRange) => {
    const clamped = clampRange(next, limits);
    if (onDepthRangeChange) onDepthRangeChange(clamped); else setLocalRange(clamped);
  };
  const wheelState = useRef({ range, limits, onDepthRangeChange });
  useEffect(() => { wheelState.current = { range, limits, onDepthRangeChange }; });
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const wheel = (event: WheelEvent) => {
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const rect = body.getBoundingClientRect(), current = wheelState.current;
      const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / (rect.height || plotHeight)));
      const depth = current.range[0] + ratio * (current.range[1] - current.range[0]);
      const next = clampRange(visibleWindow(current.range, event.deltaY < 0 ? 1.2 : 1 / 1.2, depth), current.limits);
      if (current.onDepthRangeChange) current.onDepthRangeChange(next); else setLocalRange(next);
    };
    body.addEventListener('wheel', wheel, { passive: false });
    return () => body.removeEventListener('wheel', wheel);
  }, [plotHeight]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const colors = readChromeColors(containerRef.current);
      const prepare = (canvas: HTMLCanvasElement | null | undefined, width: number) => {
        if (!canvas) return null;
        const dpr = globalThis.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(plotHeight * dpr);
        const ctx = canvas.getContext('2d'); ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
      };
      const axis = prepare(axisRef.current, AXIS_WIDTH);
      if (axis) drawDepthAxis(axis, { width: AXIS_WIDTH, height: plotHeight, range, colors,
        crosshairDepth: hover, font: '12px ui-monospace, Consolas, monospace' });
      for (const track of tracks) {
        const ctx = prepare(canvases.current.get(track.id), trackWidth(track));
        if (!ctx) continue;
        drawTrack(ctx, { width: trackWidth(track), height: plotHeight, track, range, colors, crosshairDepth: hover });
        if (preview?.trackId === track.id) {
          const y = (preview.range[0] - range[0]) / (range[1] - range[0]) * plotHeight;
          const h = (preview.range[1] - preview.range[0]) / (range[1] - range[0]) * plotHeight;
          ctx.save(); ctx.fillStyle = colors.crosshair; ctx.globalAlpha = 0.18;
          ctx.fillRect(0, y, trackWidth(track), Math.max(2, h)); ctx.restore();
          ctx.strokeStyle = colors.crosshair; ctx.setLineDash([4, 3]);
          ctx.strokeRect(1, y, trackWidth(track) - 2, Math.max(2, h)); ctx.setLineDash([]);
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [tracks, range, plotHeight, hover, preview]);
  const depthAt = (event: ReactPointerEvent) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    return range[0] + Math.max(0, Math.min(1, (event.clientY - (rect?.top ?? 0)) / (rect?.height || plotHeight))) * (range[1] - range[0]);
  };
  const down = (event: ReactPointerEvent<HTMLCanvasElement>, track: TrackSpec) => {
    if (event.button !== 0) return;
    const depth = depthAt(event);
    const kind = interactionMode === 'pan' || !track.intervals ? 'pan' : interactionMode;
    const next: Gesture = { trackId: track.id, startDepth: depth, startY: event.clientY, range, kind };
    if (kind === 'boundary') {
      if (!track.editable) return;
      let nearest = (range[1] - range[0]) / plotHeight * 10;
      for (const row of track.intervals ?? []) for (const edge of ['from', 'to'] as const) {
        const distance = Math.abs(row[edge] - depth);
        if (distance <= nearest) { nearest = distance; next.intervalId = row.id; next.edge = edge; }
      }
      if (!next.intervalId) return;
    }
    if (kind === 'range' && !track.editable) return;
    gesture.current = next; event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const depth = depthAt(event); setHover(depth);
    const current = gesture.current;
    if (!current) return;
    if (current.kind === 'pan') {
      const delta = (current.startY - event.clientY) / plotHeight * (current.range[1] - current.range[0]);
      commit([current.range[0] + delta, current.range[1] + delta]);
    } else if (current.kind === 'range') setPreview({ trackId: current.trackId, range: [Math.min(current.startDepth, depth), Math.max(current.startDepth, depth)] });
    else if (current.kind === 'boundary') setPreview({ trackId: current.trackId, range: [depth, depth] });
  };
  const up = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = gesture.current;
    if (!current) return;
    const depth = depthAt(event); gesture.current = null; setPreview(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (current.kind === 'select' || (current.kind === 'pan' && Math.abs(event.clientY - current.startY) < 3)) onTrackSelect?.({ trackId: current.trackId, depth });
    else if (current.kind === 'range' && Math.abs(depth - current.startDepth) > 0.05) onRangeSelect?.(current.trackId, [Math.min(depth, current.startDepth), Math.max(depth, current.startDepth)]);
    else if (current.kind === 'boundary' && current.intervalId && current.edge) onBoundaryChange?.(current.trackId, current.intervalId, current.edge, depth);
  };
  return <div ref={containerRef} className={`wellog ${className ?? ''}`} style={{ height }}>
    <div className="wellog__scroll">
      <div className="wellog__headers" style={{ height: HEADER_HEIGHT }}>
        <div className="wellog__axis-heading" style={{ width: AXIS_WIDTH }}>{labels.axis}</div>
        {tracks.map(track => <button type="button" key={track.id} className="wellog__heading" style={{ width: trackWidth(track) }} onClick={() => onTrackHeaderClick?.(track.id)}>
          <strong>{track.title}</strong><small>{track.subtitle ?? ''}</small>
          <span>{track.curves.map(curve => <span key={curve.id} style={{ color: curve.color ?? curveColor(curve.type) }}>{curve.scale.min}–{curve.scale.max} {curve.unit}{curve.scale.log ? ' · log' : ''}</span>)}</span>
        </button>)}
      </div>
      <div ref={bodyRef} className={`wellog__body wellog__body--${interactionMode}`} style={{ height: plotHeight }} onPointerLeave={() => { if (!gesture.current) setHover(null); }}>
        <canvas ref={axisRef} role="img" aria-label={labels.depthAxis} className="wellog__axis" style={{ width: AXIS_WIDTH, height: plotHeight }} />
        {tracks.map(track => <canvas key={track.id} ref={node => { if (node) canvases.current.set(track.id, node); else canvases.current.delete(track.id); }}
          role="img" aria-label={`${labels.track} ${track.title}`} className="wellog__track" style={{ width: trackWidth(track), height: plotHeight }}
          onPointerDown={event => down(event, track)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { gesture.current = null; setPreview(null); }} />)}
      </div>
    </div>
    <div className="wellog__readout" aria-live="off">
      <strong>{hover === null ? '—' : hover.toFixed(2)} {labels.unit}</strong>
      {tracks.flatMap(track => track.curves.map(curve => { const value = hover === null ? undefined : valueAtDepth(curve.data, hover);
        return <span key={curve.id}><i style={{ background: curve.color ?? curveColor(curve.type) }} />{curve.name}: {value === undefined ? '—' : value.toFixed(2)} {curve.unit}</span>; }))}
    </div>
  </div>;
}

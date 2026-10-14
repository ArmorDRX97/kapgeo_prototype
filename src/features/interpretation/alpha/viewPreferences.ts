import { z } from 'zod'
import type { TrackSpec } from '@kapgeo/geo-viz/wellog'
import type { AlphaPage, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import { curveSpec } from './tracks'
import { domainTokens } from '@kapgeo/geo-viz/tokens'

const scale = z.object({ min: z.number().finite(), max: z.number().finite(), log: z.boolean().optional() }).refine(s => s.max > s.min && (!s.log || s.min > 0))
const color = z.string().regex(/^#[0-9a-f]{6}$/i)
const appearance = z.object({ color, lineWidth: z.number().min(0.5).max(4), dashed: z.boolean(), markers: z.boolean(), fill: z.object({ from: z.number().finite().nonnegative(), to: z.number().finite(), baseline: z.number().finite(), color, below: z.boolean().optional() }).refine(f => f.to > f.from).optional() })
const preferences = z.object({ grid: z.boolean(), hidden: z.array(z.string()), order: z.array(z.string()), widths: z.record(z.string(), z.number().min(60).max(600)), scales: z.record(z.string(), scale), extra: z.array(z.string()).max(10), comparisonWell: z.string(), comparisonOffset: z.number().finite().min(-100).max(100), styles: z.record(z.string(), appearance).default({}), notes: z.array(z.object({ id: z.string(), trackId: z.string(), depth: z.number().finite().nonnegative(), text: z.string().trim().min(1).max(120) })).max(100).default([]) })
export type CurveAppearance = z.infer<typeof appearance>
export type AlphaViewPreferences = z.infer<typeof preferences>
export type AlphaViews = Partial<Record<AlphaPage, AlphaViewPreferences>>
export const defaultAlphaView = (): AlphaViewPreferences => ({ grid: true, hidden: [], order: [], widths: {}, scales: {}, extra: [], comparisonWell: '', comparisonOffset: 0, styles: {}, notes: [] })
export const alphaViewKey = (wellId: string) => `kapgeo.alpha.tablet.v1:${wellId}`
export function loadAlphaViews(wellId: string): AlphaViews {
  try { const parsed = z.record(z.string(), preferences).safeParse(JSON.parse(localStorage.getItem(alphaViewKey(wellId)) ?? '{}')); return parsed.success ? parsed.data : {} } catch { return {} }
}
export function saveAlphaViews(wellId: string, views: AlphaViews) { localStorage.setItem(alphaViewKey(wellId), JSON.stringify(views)) }
export function styledTracks(tracks: TrackSpec[], view: AlphaViewPreferences): TrackSpec[] {
  return tracks.map(t => ({ ...t, curves: t.curves.map(c => { const style = view.styles[c.id]; return { ...c, ...style, fill: style ? style.fill : c.fill, scale: view.scales[c.id] ?? c.scale } }), annotations: view.notes.filter(n => n.trackId === t.id).map(n => ({ ...n, color: domainTokens.plan.label, background: domainTokens.interpretation.neutral })) }))
}
export function displayedTracks(base: TrackSpec[], view: AlphaViewPreferences, records: MeasurementRecord[], includeHidden = false): TrackSpec[] {
  const extra = view.extra.flatMap(id => { const r = records.find(s => s.id === id); return r ? [{ id: `extra-${r.id}`, title: r.name, width: 180, curves: [curveSpec(r)] }] : [] })
  return styledTracks([...base, ...extra].filter(t => includeHidden || !view.hidden.includes(t.id)).map(t => ({ ...t, width: view.widths[t.id] ?? t.width, grid: view.grid })), view)
    .sort((a, b) => (view.order.includes(a.id) ? view.order.indexOf(a.id) : 1000) - (view.order.includes(b.id) ? view.order.indexOf(b.id) : 1000))
}

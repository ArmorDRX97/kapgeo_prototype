import type { CurveSpec, IntervalSpec, TrackSpec } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import type { AlphaDocument, AlphaPage, DepthInterval, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { valueAt } from '../../../entities/interpretation/lib/alphaNumeric'

export const alphaColors = { ore: '#ed9fc6', offbalance: '#f9dce9', technological: '#d8d8d8', filter: '#6acaca', sump: '#f5d3a1', cement: '#b8bdc0', oxidation: '#f3e468', project: '#b9b5e9', flow: '#d793c0', background: '#547cb7' }
export function curveSpec(record: MeasurementRecord): CurveSpec {
  const known = record.values.filter((n): n is number => n !== null), min = Math.min(...known, 0), max = Math.max(...known, 1)
  return { id: record.id, name: record.name, type: record.kind, unit: record.unit, data: { depths: record.depths, values: record.values.map(v => v ?? NaN) }, scale: { min, max: Math.ceil(max / 10) * 10 } }
}
const intervals = (rows: (DepthInterval & { label?: string })[], fill: string, selected?: string): IntervalSpec[] => rows.map(r => ({ ...r, label: r.label ?? `${r.from.toFixed(1)}–${r.to.toFixed(1)}`, fill, selected: r.id === selected }))
export function alphaTracks(well: InterpretationWell, doc: AlphaDocument, page: AlphaPage, sub: string, selected?: string): TrackSpec[] {
  const records = allAlphaRecords(well, doc), get = (id: string) => records.find(r => r.id === id), tracks: TrackSpec[] = []
  const addCurve = (id: string, width = 210) => { const r = get(id); if (r) tracks.push({ id, title: r.name, subtitle: `${r.date} · ${r.instrument}`, width, curves: [curveSpec(r)] }) }
  const column = (id: string, title: string, rows: IntervalSpec[], width = 110) => tracks.push({ id, title, width, curves: [], intervals: rows, editable: true })
  const lithology = () => column('electro', 'Литология', doc.electro.rows.map(r => ({ ...r, label: { sand: 'Песок', clay: 'Глина', silt: 'Алеврит', sandstone: 'Песчаник', limestone: 'Известняк', unknown: 'Нет данных' }[r.rock], fill: domainTokens.lithology[r.rock], pattern: r.rock === 'sand' ? 'dots' : r.rock === 'clay' ? 'lines' : undefined, selected: r.id === selected })))
  const filter = () => column('current', 'Факт · фильтр', doc.current.rows.map(r => ({ ...r, label: r.id === 'actual-filter' ? 'Фильтр' : 'Отстойник', fill: r.id === 'actual-filter' ? alphaColors.filter : alphaColors.sump, selected: r.id === selected })))
  const gamma = () => column('gamma', 'Руда · U, %', doc.gamma.rows.map(r => ({ ...r, label: `${r.uranium.toFixed(3)}%`, fill: alphaColors[r.category === 'balance' ? 'ore' : r.category], selected: r.id === selected })))
  const kf = () => column('kf', 'Кф · м/сут', doc.electro.rows.map(r => ({ ...r, label: r.rock === 'unknown' ? 'Нет данных' : r.kf.toFixed(2), fill: r.lft === 0 ? alphaColors.offbalance : r.lft === 1 ? '#d3d8da' : r.lft === 2 ? '#acd7eb' : '#6496dc' })), 90)
  if (page === 'gamma' || page === 'passport') {
    addCurve(doc.parameters.gamma.recordId, 190); gamma(); column('oxidation', 'ЗПО', intervals(doc.oxidation, alphaColors.oxidation, selected), 75); lithology(); kf(); filter()
    if (page === 'passport') { addCurve(doc.parameters.electro.recordId, 140); addCurve(doc.parameters.current.recordId, 140); addCurve(doc.parameters.thermal.recordId, 140); column('thermal', 'Цементация', intervals(doc.thermal.rows, alphaColors.cement), 95) }
  } else if (page === 'electro') {
    addCurve(doc.parameters.gamma.recordId, 155); addCurve(doc.parameters.electro.recordId, 230)
    const curveTrack = tracks.at(-1), rs = get(doc.parameters.electro.recordId)
    if (curveTrack && rs) curveTrack.guides = doc.parameters.electro.levels.map((v, i) => ({ value: v / doc.parameters.electro.normalization, label: `Уровень ${i + 1}`, color: ['#c75050', '#d89836', '#56906b', '#577fc0'][i % 4]!, scale: curveSpec(rs).scale, dashed: true }))
    const sp = get('alpha-sp'); if (sp && curveTrack) curveTrack.curves.push(curveSpec(sp))
    lithology(); column('resistivity', 'Средний КС', doc.electro.rows.map(r => ({ ...r, label: r.resistivity?.toFixed(2) ?? '—', fill: '#f0f4f6' })), 100); kf()
  } else if (page === 'current') { addCurve(doc.parameters.current.recordId, 300); filter(); const t = tracks[0]; if (t) t.guides = doc.current.rows.flatMap(r => [r.from, r.to].map(depth => ({ depth, label: depth.toFixed(2), color: '#c75050', dashed: true }))) }
  else if (page === 'thermal' && (sub === 'induction' || sub === 'projects')) {
    addCurve(doc.parameters.thermal.inductionId, 340); const t = tracks[0]; if (t) t.guides = doc.metal.rows.map(m => ({ depth: m.depth, label: `${m.label} · ${m.depth.toFixed(2)}`, color: '#ad5ba0', dashed: true }))
    column('projects', 'Проект · конструкция', intervals(doc.projects, alphaColors.project, selected), 160)
  } else if (page === 'thermal') {
    addCurve(doc.parameters.thermal.recordId, 330); const t = tracks[0], p = doc.parameters.thermal, r = get(p.recordId)
    if (t && r) t.curves.push({ id: 'thermal-background', name: 'Фон', type: 'TM', color: alphaColors.background, unit: '°C', scale: curveSpec(r).scale, data: { depths: [p.backgroundFrom, p.backgroundTo], values: [p.autoBackground ? valueAt(r, p.backgroundFrom) ?? NaN : p.backgroundTop, p.autoBackground ? valueAt(r, p.backgroundTo) ?? NaN : p.backgroundBottom] } })
    column('thermal', 'Цементное кольцо', intervals(doc.thermal.rows, alphaColors.cement, selected), 170); filter()
  } else if (page === 'caliper') {
    addCurve(doc.parameters.caliper.recordId, 310); const t = tracks[0], r = get(doc.parameters.caliper.recordId)
    if (t && r) t.guides = [{ value: doc.parameters.caliper.target, label: 'Целевой диаметр', color: '#c75050', scale: curveSpec(r).scale }]
    column('caliper', 'Факт · расширение', intervals(doc.caliper.rows, alphaColors.project, selected), 145); column('project-caliper', 'Проект · расширение', intervals([{ id: 'kmr-project', from: doc.parameters.caliper.projectFrom, to: doc.parameters.caliper.projectTo }], '#dfdcf2'), 120); filter()
  } else if (page === 'flow') {
    lithology(); kf(); addCurve(doc.parameters.flow.recordId, 240); filter(); column('sections', 'Секции фильтра', intervals(doc.sections, alphaColors.filter, selected), 110)
    tracks.push({ id: 'flow', title: 'Дебит · м³/час', subtitle: 'Дифференциальная РМ', width: 220, curves: [], bars: doc.flow.rows.map(r => ({ ...r, value: r.rate, label: r.rate.toFixed(2), fill: alphaColors.flow })), barMax: Math.max(...doc.flow.rows.map(r => r.rate), 1) })
  } else if (page === 'controls') {
    addCurve(doc.parameters.controls.mainId, 310); addCurve(doc.parameters.controls.controlId, 310)
    doc.controls.rows.forEach(r => { const t = tracks[0], c = tracks[1]; if (t) t.intervals = intervals([{ id: r.id, from: r.from, to: r.to }], alphaColors.offbalance); if (c) c.intervals = intervals([{ id: r.id, from: r.controlFrom, to: r.controlTo }], alphaColors.offbalance) })
  } else if (page === 'curves') addCurve(sub || 'alpha-gr', 580)
  return tracks
}

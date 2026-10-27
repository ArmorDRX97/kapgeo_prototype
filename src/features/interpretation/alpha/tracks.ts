import type { CurveSpec, IntervalSpec, TrackSpec } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import type { AlphaDocument, AlphaPage, DepthInterval, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { rockNames, electroLevels } from '../../../entities/interpretation/lib/alphaElectro'
import { thresholdIntervals, valueAt } from '../../../entities/interpretation/lib/alphaNumeric'
import { zadrSummary } from '../../../entities/interpretation/lib/alphaGammaReports'

export const alphaColors = domainTokens.interpretation
export function curveSpec(record: MeasurementRecord): CurveSpec {
  const known = record.values.filter((n): n is number => n !== null)
  const min = record.kind === 'TM' ? Math.floor(Math.min(...known, 18) * 2) / 2 : Math.floor(Math.min(...known, 0) / 10) * 10
  const max = record.kind === 'TM' ? Math.ceil(Math.max(...known, min + 1) * 2) / 2 : Math.ceil(Math.max(...known, 1) / 10) * 10
  return { markers: record.kind === 'FLOW', id: record.id, name: record.name, type: record.kind, unit: record.unit, data: { depths: record.depths, values: record.values.map(v => v ?? NaN) }, scale: { min, max } }
}
const intervals = (rows: (DepthInterval & { label?: string })[], fill: string, selected?: string): IntervalSpec[] => rows.map(r => ({ ...r, label: r.label ?? `${r.from.toFixed(1)}–${r.to.toFixed(1)}`, fill, selected: r.id === selected }))
export function alphaTracks(well: InterpretationWell, doc: AlphaDocument, page: AlphaPage, sub: string, selected?: string): TrackSpec[] {
  const records = allAlphaRecords(well, doc), get = (id: string) => records.find(r => r.id === id), tracks: TrackSpec[] = []
  const addCurve = (id: string, width = 210) => { const r = get(id); if (r) tracks.push({ id, title: r.name, subtitle: `${r.date} · ${r.instrument}`, width, curves: [curveSpec(r)] }) }
  const column = (id: string, title: string, rows: IntervalSpec[], width = 110) => tracks.push({ id, title, width, curves: [], intervals: rows, editable: true })
  const lithology = () => column('electro', 'Литология', doc.electro.rows.map(r => ({ ...r, label: `${r.lithologyCode || ''} ${rockNames[r.rock]}`.trim(), fill: domainTokens.lithology[r.rock], pattern: r.rock === 'sand' ? 'dots' : r.rock === 'clay' ? 'lines' : undefined, selected: r.id === selected })))
  const filter = () => column('current', 'Факт · фильтр', doc.current.rows.map(r => ({ ...r, label: r.id === 'actual-filter' ? 'Фильтр' : 'Отстойник', fill: r.id === 'actual-filter' ? alphaColors.filter : alphaColors.sump, selected: r.id === selected })))
  const gamma = () => column('gamma', 'Руда · U, %', doc.gamma.rows.map(r => ({ ...r, label: `${r.uranium.toFixed(3)}%`, fill: r.category === 'technological' ? alphaColors.technological : page === 'passport' ? r.category === 'balance' ? alphaColors.ore : alphaColors.offbalance : r.category === 'balance' ? alphaColors.editorOre : alphaColors.editorOffbalance, selected: r.id === selected })))
  const kf = () => column('kf', 'Кф · м/сут', doc.electro.rows.map(r => ({ ...r, label: r.rock === 'unknown' ? 'Нет данных' : r.kf.toFixed(2), fill: r.lft === 0 ? alphaColors.offbalance : r.lft === 1 ? alphaColors.lowKf : r.lft === 2 ? alphaColors.middleKf : alphaColors.highKf })), 90)
  if (page === 'gamma' || page === 'passport') {
    addCurve(doc.parameters.gamma.recordId, 190); gamma(); column('oxidation', 'ЗПО', intervals(doc.oxidation, alphaColors.oxidation, selected), 75); lithology(); kf(); filter()
    if (page === 'gamma') {
      column('filter-proposal', 'Предложение · фильтр', intervals([{ id: 'proposal-filter', ...doc.filterProposal }], alphaColors.project).map(r => ({ ...r, pattern: 'diagonal' })), 115)
      const zone = zadrSummary(doc, well.depth); if (zone) { column('zadr', 'ЗАДР', intervals([{ id: 'zone-active', from: zone.from, to: zone.to }], alphaColors.zadr), 90); tracks.at(-1)!.editable = false }
    }
    if (page === 'passport') { addCurve('alpha-sp', 140); addCurve(doc.parameters.electro.recordId, 140); addCurve(doc.parameters.current.recordId, 140); addCurve(doc.parameters.thermal.recordId, 140); column('thermal', 'Цементация', intervals(doc.thermal.rows, alphaColors.cement), 95) }
  } else if (page === 'electro') {
    addCurve(doc.parameters.gamma.recordId, 155); addCurve(doc.parameters.electro.recordId, 230)
    const curveTrack = tracks.at(-1), rs = get(doc.parameters.electro.recordId)
    if (curveTrack && rs) curveTrack.guides = electroLevels(well, doc).map((v, i) => ({ id: `level-${i}`, value: v / doc.parameters.electro.normalization, label: `Уровень ${i + 1}`, color: [alphaColors.levelLow, alphaColors.levelPermeable, alphaColors.levelMedium, alphaColors.levelHigh][i % 4]!, scale: curveSpec(rs).scale, dashed: true }))
    const sp = get('alpha-sp'); if (sp && curveTrack) curveTrack.curves.push(curveSpec(sp))
    lithology(); column('resistivity', 'Средний КС', doc.electro.rows.map(r => ({ ...r, label: r.resistivity?.toFixed(2) ?? '—', fill: alphaColors.neutral })), 100); kf()
  } else if (page === 'current') { addCurve(doc.parameters.current.recordId, 300); filter(); const t = tracks[0]; if (t) t.guides = doc.current.rows.flatMap(r => (r.id === 'actual-filter' ? ['from', 'to'] as const : ['to'] as const).map(edge => ({ id: `${r.id}:${edge}`, depth: r[edge], label: r[edge].toFixed(2), color: alphaColors.levelLow, dashed: true }))) }
  else if (page === 'thermal' && (sub === 'induction' || sub === 'projects')) {
    addCurve(doc.parameters.thermal.inductionId, 340); const t = tracks[0]; if (t) t.guides = doc.metal.rows.map(m => ({ id: m.id, depth: m.depth, label: `${m.label} · ${m.depth.toFixed(2)}`, color: alphaColors.metal, dashed: true }))
    column('projects', 'Проект · конструкция', intervals(doc.projects, alphaColors.project, selected), 160)
  } else if (page === 'thermal') {
    addCurve(doc.parameters.thermal.recordId, 330); const t = tracks[0], p = doc.parameters.thermal, r = get(p.recordId)
    if (t && r) t.curves.push({ id: 'thermal-background', name: 'Фон', type: 'TM', color: alphaColors.background, unit: '°C', scale: curveSpec(r).scale, data: { depths: [p.backgroundFrom, p.backgroundTo], values: [p.autoBackground ? valueAt(r, p.backgroundFrom) ?? NaN : p.backgroundTop, p.autoBackground ? valueAt(r, p.backgroundTo) ?? NaN : p.backgroundBottom] } })
    column('thermal', 'Цементное кольцо', intervals(doc.thermal.rows, alphaColors.cement, selected), 170); filter()
  } else if (page === 'caliper') {
    addCurve(doc.parameters.caliper.recordId, 310); const t = tracks[0], r = get(doc.parameters.caliper.recordId)
    if (t && r) t.curves[0]!.fill = { from: doc.parameters.caliper.projectFrom, to: doc.parameters.caliper.projectTo, baseline: doc.parameters.caliper.target, color: alphaColors.metal, below: true }
    if (t && r) t.guides = [{ id: 'target-diameter', value: doc.parameters.caliper.target, label: 'Целевой диаметр', color: alphaColors.levelLow, scale: curveSpec(r).scale }]
    if (r?.stage === 'expanded') { const deficit = thresholdIntervals(r, doc.parameters.caliper.projectFrom, doc.parameters.caliper.projectTo, -doc.parameters.caliper.target, value => -value).filter(s => s.to - s.from >= 0.05); if (t) t.intervals = intervals(deficit.map(s => ({ ...s, label: 'Недостаточный Ø' })), alphaColors.metal).map(s => ({ ...s, pattern: 'diagonal' })); column('caliper-deficit', 'Недостаточный Ø', intervals(deficit, alphaColors.metal), 120); tracks.at(-1)!.editable = false }
    column('caliper', 'Факт · расширение', intervals(doc.caliper.rows, alphaColors.project, selected), 145); column('project-caliper', 'Проект · расширение', intervals([{ id: 'kmr-project', from: doc.parameters.caliper.projectFrom, to: doc.parameters.caliper.projectTo }], alphaColors.projectLight), 120); filter()
  } else if (page === 'flow') {
    lithology(); kf(); addCurve(doc.parameters.flow.recordId, 240); filter(); column('sections', 'Секции фильтра', intervals(doc.sections, alphaColors.filter, selected), 110)
    tracks.push({ id: 'flow', title: 'Дебит · м³/час', subtitle: 'Дифференциальная РМ', width: 220, curves: [], bars: doc.flow.rows.map(r => ({ ...r, value: r.rate, label: r.rate.toFixed(2), fill: alphaColors.flow })), barMax: Math.max(...doc.flow.rows.map(r => r.rate), 1) })
  } else if (page === 'controls') {
    addCurve(doc.parameters.controls.mainId, 310); addCurve(doc.parameters.controls.controlId, 310)
    if (tracks[0]) tracks[0].intervals = intervals(doc.controls.rows.filter(r => r.mainArea !== null), alphaColors.offbalance)
    if (tracks[1]) tracks[1].intervals = intervals(doc.controls.rows.filter(r => r.controlArea !== null).map(r => ({ id: r.id, from: r.controlFrom, to: r.controlTo })), alphaColors.offbalance)
  } else if (page === 'curves') addCurve(sub || 'alpha-gr', 580)
  if (['gamma', 'electro', 'passport', 'flow'].includes(page)) {
  column('permeability', 'Проницаемость', doc.electro.rows.map(r => ({ ...r, label: r.rock === 'unknown' ? 'Нет данных' : r.lft > 0 ? 'Проницаемые' : 'Непроницаемые', fill: r.rock === 'unknown' ? '#eeeeee' : r.lft > 0 ? '#b8dfe4' : '#b8b6c6', pattern: r.lft === 0 ? 'lines' : undefined })), 120)
  column('geochemistry', 'Геохимия · код', doc.electro.rows.map(r => ({ ...r, label: r.geochemistryCode || 'Не задан', fill: '#f1eee6', pattern: r.geochemistryCode ? 'diagonal' : undefined })), 100)
    tracks.slice(-2).forEach(t => { t.editable = false })
  }
  return tracks
}

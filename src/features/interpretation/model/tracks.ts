import type { CurveScale, CurveSpec, IntervalSpec, TrackSpec } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import { mappedCore, mappedSamples, mineralsOf } from '../../../entities/interpretation/lib/commands'
import { derivedRuns, isNoCore, mappedMeasurements } from '../../../entities/interpretation/lib/core'
import type { InterpretationDocument, InterpretationMode, InterpretationWell, LithologyInterval, LithologyKind, SampleKind, TechnologyInterval } from '../../../entities/interpretation/model/types'
import { interpretationCopy as copy } from './copy'

export type ViewSettings = { source: boolean; rs: boolean; gr: boolean; control: boolean; measurements: boolean }
export type Selection = { trackId: string; id: string } | null
export const initialView: ViewSettings = { source: true, rs: true, gr: true, control: false, measurements: true }
export const coreColorFills = { gray: domainTokens.lithology.clay, brown: domainTokens.lithology.sandstone, yellow: domainTokens.lithology.sand, green: domainTokens.lithology.marl, white: domainTokens.lithology.limestone }
export function lithologySpecs(rows: LithologyInterval[], selection: Selection, trackId: string): IntervalSpec[] {
  return rows.map(row => ({ ...row, label: copy.rocks[row.rock], fill: domainTokens.lithology[row.rock], pattern: row.rock === 'sand' ? 'dots' : row.rock === 'clay' ? 'lines' : row.rock === 'unknown' ? 'diagonal' : undefined,
    selected: selection?.trackId === trackId && selection.id === row.id }))
}
export function technologySpecs(rows: TechnologyInterval[], selection: Selection, preview = false): IntervalSpec[] {
  return rows.map(row => ({ ...row, label: copy.technology[row.kind], fill: row.kind === 'permeable' ? domainTokens.lithology.sand : row.kind === 'impermeable' ? domainTokens.lithology.clay : domainTokens.lithology.unknown,
    pattern: row.kind === 'permeable' ? 'dots' : row.kind === 'unknown' ? 'diagonal' : 'lines', selected: selection?.trackId === 'technology' && selection.id === row.id, preview }))
}
export function buildTracks(well: InterpretationWell, doc: InterpretationDocument, mode: InterpretationMode, kind: LithologyKind, selection: Selection,
  view: ViewSettings, scales: Record<string, CurveScale>, editable: boolean, preview?: TechnologyInterval[] | null, sampleKind: SampleKind = 'KP'): TrackSpec[] {
  const tracks: TrackSpec[] = []
  if (mode === 'lithology') {
    if (view.source && kind !== 'core') tracks.push({ id: 'source', title: 'Литология', subtitle: 'По керну · источник', curves: [], width: 112, intervals: lithologySpecs(well.sourceLithology, selection, 'source') })
    const rows = kind === 'core' ? well.sourceLithology : kind === 'log' ? doc.logLithology : doc.compositeLithology
    tracks.push({ id: 'lithology', title: copy.kinds[kind], subtitle: kind === 'core' ? 'Исходные данные' : 'Редактируемая колонка', width: 144, curves: [], editable: editable && kind !== 'core', intervals: lithologySpecs(rows, selection, 'lithology') })
    if (kind !== 'log') tracks.push({ id: 'core-color', title: 'Цвет керна', subtitle: 'Цвет породы', width: 80, curves: [], intervals: rows.filter(r => r.color).map(r => ({ ...r, fill: coreColorFills[r.color!], label: copy.colors[r.color!] })) })
    tracks.push({ id: 'minerals', title: 'Минерализации', subtitle: 'Набор свойств', width: 112, curves: [], intervals: rows.filter(r => mineralsOf(r).length).map(r => ({ ...r, label: mineralsOf(r).join(', '), fill: domainTokens.lithology.limestone })) })
  } else if (mode === 'technology') {
    if (view.source) tracks.push({ id: 'source', title: 'Литология', subtitle: 'Сводная', width: 112, curves: [], intervals: lithologySpecs(doc.compositeLithology, selection, 'source') })
    tracks.push({ id: 'technology', title: 'Проницаемость', subtitle: 'Текущий результат', width: 144, curves: [], editable, intervals: technologySpecs(doc.technology, selection) })
    if (preview) tracks.push({ id: 'preview', title: 'Предпросмотр', subtitle: 'Расчёт по КС', width: 144, curves: [], intervals: technologySpecs(preview, null, true) })
  } else {
    tracks.push({ id: 'runs', title: 'Рейсы', subtitle: 'Сводные · выход керна', width: 96, curves: [], intervals: derivedRuns(well, doc).map(run => ({ ...run, label: `${run.recovered.toFixed(1)} / ${(run.to - run.from).toFixed(1)} м`, fill: domainTokens.lithology.limestone })) })
    if (view.source) tracks.push({ id: 'core-source', title: 'Исходный керн', subtitle: 'По бурению', width: 112, curves: [], intervals: lithologySpecs(well.core.flatMap(s => s.lithology), selection, 'core-source') })
    tracks.push({ id: 'core-result', title: 'Привязанный керн', subtitle: 'Сводная глубина', width: 128, curves: [], intervals: lithologySpecs(mappedCore(well, doc), null, 'core-result') })
    // Segment selection remains explicit even when lithologies share a contact.
    tracks.push({ id: 'core', title: 'Сегменты', subtitle: 'Керн / бескерновые', width: 108, curves: [], intervals: doc.core.map((s, i) => ({ ...s, label: `${isNoCore(s) ? 'Без керна' : 'Керн'} ${i + 1}${s.reversed ? ' ↕' : ''}${s.properties ? ' · правка' : ''}`, pattern: isNoCore(s) ? 'diagonal' : undefined, fill: isNoCore(s) ? domainTokens.lithology.unknown : domainTokens.lithology.sandstone, selected: selection?.trackId === 'core' && selection.id === s.id })) })
    const sampleRows = mappedSamples(well, doc).filter(s => s.kind === sampleKind)
    tracks.push({ id: 'samples-source', title: `${copy.sampleKinds[sampleKind]} · исходные`, subtitle: 'По бурению', width: 112, curves: [], intervals: sampleRows.map(s => ({ ...s, from: s.sourceFrom, to: s.sourceTo, label: s.name.replace('DEMO-', ''), fill: domainTokens.lithology.marl })) })
    tracks.push({ id: 'samples', title: `${copy.sampleKinds[sampleKind]} · сводные`, subtitle: 'Выбрать пробу', width: 112, curves: [], editable, intervals: sampleRows.map(s => ({ ...s, label: s.name.replace('DEMO-', ''), fill: domainTokens.lithology.marl, selected: selection?.trackId === 'sample' ? selection.id === s.id : selection?.trackId === 'core' && selection.id === s.segmentId })) })
    if (view.measurements && well.core.length) {
      const points = mappedMeasurements(well, doc)
      // Each recovered segment is separated by NaN; no line through unrecovered core.
      const depths: number[] = [], values: number[] = []
      for (const s of [...doc.core].filter(s => !isNoCore(s) && s.to > s.from).sort((a, b) => a.from - b.from)) {
        const segmentPoints = points.filter(p => p.segmentId === s.id)
        depths.push(s.from); values.push(Number.NaN)
        for (const p of segmentPoints) { depths.push(p.depth); values.push(p.value) }
        depths.push(s.to); values.push(Number.NaN)
      }
      tracks.push({ id: 'measurement', title: 'Промер керна', subtitle: 'Сводная глубина', width: 124, curves: [{ id: 'measurement', name: 'Промер', type: 'GR', unit: 'мкР/ч', scale: { min: 0, max: 60 }, data: { depths, values } }] })
    }
  }
  for (const original of well.curves) {
    const show = original.id === 'rs-main' ? view.rs : original.id === 'gr-main' ? view.gr : view.control
    if (!show) continue
    const curve: CurveSpec = { ...original, scale: scales[original.id] ?? original.scale }
    tracks.push({ id: original.id, title: original.name, subtitle: original.id === 'rs-control' ? 'Набор B' : 'Набор A', curves: [curve], width: 160 })
  }
  return tracks
}

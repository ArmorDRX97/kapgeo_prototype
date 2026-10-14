import type { AlphaDocument, ControlPair, ControlRange, DepthInterval, MeasurementRecord } from '../model/alphaTypes'
import { integrate, rounded, thresholdIntervals } from './alphaNumeric'

/** Pair by depth after the explicit window offset. Unmatched intervals remain visible. */
export type ControlInterpretation = { main: DepthInterval[]; control: DepthInterval[]; statistics: (side: 'main' | 'control', span: DepthInterval) => { area: number | null; covered: number } }
export function productionPairs(main: MeasurementRecord, control: MeasurementRecord, doc: AlphaDocument, interpreted?: ControlInterpretation) {
  const p = doc.parameters.controls, threshold = doc.parameters.gamma.cutoff
  const first = interpreted?.main ?? thresholdIntervals(main, p.from, p.to, threshold), remaining = [...(interpreted?.control ?? thresholdIntervals(control, p.controlFrom, p.controlTo, threshold))]
  const offset = p.controlFrom - p.from, pairs: { main: DepthInterval | null; control: DepthInterval | null }[] = []
  for (const span of first) {
    const candidates = remaining.map((r, index) => ({ r, index, distance: Math.abs((r.from + r.to) / 2 - (span.from + span.to) / 2 - offset) }))
      .filter(({ r }) => r.to >= span.from + offset - p.depthTolerance && r.from <= span.to + offset + p.depthTolerance).sort((a, b) => a.distance - b.distance)
    const match = candidates[0]
    pairs.push({ main: span, control: match?.r ?? null })
    if (match) remaining.splice(match.index, 1)
  }
  return [...pairs, ...remaining.map(span => ({ main: null, control: span }))]
}

export function controlRows(main: MeasurementRecord, control: MeasurementRecord, doc: AlphaDocument, production: boolean, interpreted?: ControlInterpretation): ControlPair[] {
  const p = doc.parameters.controls
  const manual: ControlRange[] = p.pairing === 'manual' && p.pairs.length ? p.pairs : [{ id: 'pair-1', from: p.from, to: p.to, controlFrom: p.controlFrom, controlTo: p.controlTo }]
  const pairs = production && p.pairing === 'automatic' ? productionPairs(main, control, doc, interpreted) : manual.map(r => ({ main: { id: r.id, from: r.from, to: r.to }, control: { id: r.id, from: r.controlFrom, to: r.controlTo } }))
  return pairs.map((pair, index) => {
    const a = pair.main && (interpreted ? interpreted.statistics('main', pair.main) : integrate(main, pair.main.from, pair.main.to)), b = pair.control && (interpreted ? interpreted.statistics('control', pair.control) : integrate(control, pair.control.from, pair.control.to))
    const m = pair.main ? pair.main.to - pair.main.from : null, cm = pair.control ? pair.control.to - pair.control.from : null
    const full = !!a && !!b && a.covered >= m! - 0.001 && b.covered >= cm! - 0.001
    const area = p.type === 'reference' ? p.referenceArea : a?.area ?? null, second = b?.area ?? null
    const relative = full && area !== null && Math.abs(area) > 1e-12 && second !== null ? 100 * (second - area) / Math.abs(area) : null
    const from = pair.main?.from ?? pair.control!.from, to = pair.main?.to ?? pair.control!.to
    const controlFrom = pair.control?.from ?? from, controlTo = pair.control?.to ?? to
    const depthError = Math.max(Math.abs(from - controlFrom), Math.abs(to - controlTo)), thicknessError = m !== null && cm !== null ? Math.abs(m - cm) : 0
    return { id: `control-pair-${index + 1}`, from, to, controlFrom, controlTo, mainArea: area, controlArea: second, relative,
      mainThickness: m, controlThickness: cm, mainMetro: production ? a?.area ?? null : null, controlMetro: production ? b?.area ?? null : null,
      thicknessRelative: m !== null && cm !== null ? 100 * (cm - m) / m : null,
      depthError: rounded(depthError), thicknessError: rounded(thicknessError),
      status: relative === null ? 'unmatched' : Math.abs(relative) > p.tolerance || depthError > p.depthTolerance || thicknessError > p.thicknessTolerance ? 'fail' : 'pass' }
  })
}
export function controlSummary(rows: ControlPair[]) {
  const matched = rows.filter(r => r.status !== 'unmatched'), values = matched.map(r => r.relative!)
  return { count: rows.length, matched: matched.length, unmatched: rows.length - matched.length, failed: matched.filter(r => r.status === 'fail').length,
    mean: values.length ? values.reduce((s, r) => s + r, 0) / values.length : null,
    rms: values.length ? Math.sqrt(values.reduce((s, r) => s + r * r, 0) / values.length) : null,
    mainMetro: matched.reduce((s, r) => s + (r.mainMetro ?? 0), 0), controlMetro: matched.reduce((s, r) => s + (r.controlMetro ?? 0), 0),
    status: !rows.length || rows.some(r => r.status === 'unmatched') ? 'unmatched' : rows.some(r => r.status === 'fail') ? 'fail' : 'pass' }
}

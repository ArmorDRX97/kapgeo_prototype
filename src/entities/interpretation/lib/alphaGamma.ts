import { allAlphaRecords } from '../model/alphaFixtures'
import type { AlphaDocument, DepthInterval, MeasurementRecord, OreInterval } from '../model/alphaTypes'
import type { InterpretationWell } from '../model/types'
import { assertDepth, integrate, overlap, rounded, thresholdIntervals } from './alphaNumeric'
import { gammaCutoff, gammaKrr, isImpermeable, minimumGammaKrr, validateKrrTable } from './alphaGammaProfile'

function source(well: InterpretationWell, doc: AlphaDocument, id: string, kind: MeasurementRecord['kind']) {
  const record = allAlphaRecords(well, doc).find(r => r.id === id && r.kind === kind)
  if (!record) throw new Error('Выберите подходящую доступную запись ГИС.')
  return record
}
/** Explicit local mass-attenuation model; coefficients are supplied by the profile. */
export function gammaCorrections(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.gamma, profile = p.profile
  let diameter = p.nominalDiameter
  if (p.useCaliper) {
    assertDepth(profile.caliperFrom, profile.caliperTo, well.depth)
    const km = source(well, doc, p.caliperId, 'CAL')
    if (km.stage === 'expanded') throw new Error('КМр после расширения нельзя использовать для поправки ГК. Выберите первичную КМ.')
    const stats = integrate(km, profile.caliperFrom, profile.caliperTo)
    if (stats.mean === null || stats.covered < (profile.caliperTo - profile.caliperFrom) * 0.95) throw new Error('Первичная КМ должна покрывать не менее 95% опорного интервала.')
    diameter = stats.mean
  }
  if (diameter <= profile.probeDiameter) throw new Error('Диаметр прибора должен быть меньше диаметра скважины.')
  const fluidMass = (diameter - profile.probeDiameter) / 20 * profile.fluidDensity
  const casingMass = profile.casingThickness / 10 * profile.casingDensity
  const fluidFactor = Math.exp(profile.fluidAttenuation * fluidMass), casingFactor = Math.exp(profile.casingAttenuation * casingMass)
  const factor = p.absorption * fluidFactor * casingFactor * (p.stage === 'final' ? profile.radonFactor : 1) / (1 - p.moisture / 100)
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('Поправка ГК дала нечисловой результат. Проверьте коэффициенты поглощения.')
  return { diameter, fluidMass, casingMass, fluidFactor, casingFactor, factor }
}
export function gammaCurve(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.gamma, record = source(well, doc, p.recordId, 'GR'), corrections = gammaCorrections(well, doc)
  let values = record.values.map(value => {
    if (value === null) return null
    let signal = Math.max(0, value - p.background)
    if (p.transform && signal > 6500) signal = 6500 + Math.sqrt(signal - 6500) * 40
    return Math.max(0, signal * p.conversion * corrections.factor - p.profile.thkCorrection)
  })
  if (p.algorithm === 'weighted') values = values.map((v, i, original) => {
    if (v === null || i < 2 || i > original.length - 3) return v
    const cells = original.slice(i - 2, i + 3)
    return cells.some(x => x === null) ? v : cells.reduce<number>((s, x, j) => s + x! * [1, 2, 3, 2, 1][j]!, 0) / 9
  })
  else for (let i = 0; i < 3; i++) values = values.map((v, index, previous) => v === null || previous[index - 1] == null || previous[index + 1] == null ? v : Math.max(0, v + 0.15 * (2 * v - previous[index - 1]! - previous[index + 1]!)))
  return { ...record, values }
}
export function oreMetrics(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, morphology: OreInterval['morphology'] = 'bag', record = gammaCurve(well, doc)): OreInterval {
  const p = doc.parameters.gamma, stats = integrate(record, row.from, row.to)
  if (stats.mean === null || stats.covered < row.to - row.from - 0.001) throw new Error('Рудный интервал пересекает пропуск ГК. Разделите его по известным данным.')
  const ra = stats.mean, krr = gammaKrr(doc, row, ra, morphology), uranium = ra / krr, metro = uranium * (row.to - row.from)
  return { id: row.id, from: row.from, to: row.to, ra: rounded(ra, 5), uranium: rounded(uranium, 5), metro: rounded(metro, 5), krr: rounded(krr), morphology,
    category: p.stage === 'final' && isImpermeable(doc, row) ? 'technological' : uranium >= p.balanceCutoff && metro >= p.profile.minimumMetro ? 'balance' : 'offbalance' }
}
function mergeSpans(record: MeasurementRecord, doc: AlphaDocument, spans: DepthInterval[]) {
  const merged: DepthInterval[] = [], p = doc.parameters.gamma
  for (const span of spans) {
    const last = merged.at(-1), gap = last && { id: 'gap', from: last.to, to: span.from }
    const impermeable = gap ? doc.electro.rows.reduce((s, r) => r.kf < doc.parameters.electro.permeableKf ? s + overlap(r, gap) : s, 0) : 0
    if (last && gap && span.from - last.to <= p.gap && impermeable <= p.profile.impermeableGap && integrate(record, last.to, span.from).covered >= span.from - last.to - 0.0001) last.to = span.to
    else merged.push({ ...span })
  }
  return merged
}
function refineOre(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, morphology: OreInterval['morphology'], record: MeasurementRecord) {
  let spans = [row], converged = false
  for (let iteration = 0; iteration < doc.parameters.gamma.profile.iterations; iteration++) {
    const refined = spans.flatMap((span, index) => {
      if (span.to - span.from < 0.05) return []
      const metrics = oreMetrics(well, doc, span, morphology, record), threshold = gammaCutoff(doc, span, metrics.ra, metrics.krr, morphology)
      const from = index === 0 ? row.from : (spans[index - 1]!.to + span.from) / 2, to = index === spans.length - 1 ? row.to : (span.to + spans[index + 1]!.from) / 2
      return mergeSpans(record, doc, thresholdIntervals(record, from, to, threshold))
    })
    const unchanged = refined.length === spans.length && refined.every((r, i) => Math.abs(r.from - spans[i]!.from) < 0.001 && Math.abs(r.to - spans[i]!.to) < 0.001)
    spans = refined
    if (unchanged) { converged = true; break }
  }
  return { converged, rows: spans.filter(r => r.to - r.from >= Math.max(0.05, doc.parameters.gamma.minThickness)).map((r, i) => oreMetrics(well, doc, { ...r, id: i === 0 ? row.id : `${row.id}-part-${i + 1}` }, morphology, record)) }
}
export function refineOreInterval(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, morphology: OreInterval['morphology'], record = gammaCurve(well, doc)) {
  return refineOre(well, doc, row, morphology, record).rows
}
export function gammaIntervals(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.gamma
  if (p.profile.dependence !== 'constant') { validateKrrTable(p.profile.thicknessPermeable); validateKrrTable(p.profile.thicknessImpermeable); validateKrrTable(p.profile.radiumPermeable); validateKrrTable(p.profile.radiumImpermeable) }
  const record = gammaCurve(well, doc), cutoff = Math.min(p.cutoff, p.stage === 'final' ? p.profile.technologicalCutoff : p.cutoff)
  const spans = mergeSpans(record, doc, thresholdIntervals(record, p.from, p.to, cutoff * minimumGammaKrr(doc)))
  const refined = spans.map((span, i) => {
    const morphology = p.stage === 'final' && doc.oxidation.some(z => overlap(z, span) > 0) ? 'upper' : 'bag'
    return refineOre(well, doc, { ...span, id: `gk-${i}` }, morphology, record)
  })
  return { rows: refined.flatMap(r => r.rows), converged: refined.every(r => r.converged) }
}

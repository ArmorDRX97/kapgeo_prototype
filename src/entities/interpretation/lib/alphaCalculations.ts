import { allAlphaRecords } from '../model/alphaFixtures'
import type { AlphaDocument, CaliperParameters, ControlPair, DepthInterval, ElectroInterval, MeasurementRecord, OreInterval, Result } from '../model/alphaTypes'
import type { InterpretationWell } from '../model/types'
import { assertDepth, integrate, overlap, rounded, thresholdIntervals, valueAt } from './alphaNumeric'

type ResultKey = 'electro' | 'gamma' | 'current' | 'thermal' | 'metal' | 'caliper' | 'flow' | 'controls'
export function sourceRecord(well: InterpretationWell, doc: AlphaDocument, id: string, kind?: MeasurementRecord['kind']) {
  const record = allAlphaRecords(well, doc).find(r => r.id === id)
  if (!record || kind && record.kind !== kind) throw new Error('Выберите подходящую запись ГИС. Источник недоступен.')
  return record
}
export function alphaFingerprint(well: InterpretationWell, doc: AlphaDocument, key: ResultKey) {
  const p = key === 'metal' ? doc.parameters.thermal : doc.parameters[key]
  const ids = Object.entries(p).filter(([k]) => k.endsWith('Id')).map(([, value]) => value)
  const records = allAlphaRecords(well, doc).filter(r => ids.includes(r.id)).map(r => [r.id, r.revision, r.depths, r.values])
  const dependencies = key === 'gamma' ? [doc.electro.rows, doc.current.rows, doc.oxidation] : key === 'caliper' ? doc.current.rows : key === 'flow' ? [doc.current.rows, doc.sections, doc.electro.rows] : null
  const text = JSON.stringify([key, p, records, dependencies]); let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}
export const alphaStale = (well: InterpretationWell, doc: AlphaDocument, key: ResultKey) => !!doc[key].fingerprint && doc[key].fingerprint !== alphaFingerprint(well, doc, key)
const result = <T>(well: InterpretationWell, doc: AlphaDocument, key: ResultKey, rows: T[], note = ''): Result<T> => ({ rows, fingerprint: alphaFingerprint(well, doc, key), version: 'alpha-prototype-1', note })

/** Explicit local profile: normalized RS → linear Kf, fixed illustrative LFT classes. Not MVI. */
export function electroMetrics(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, rock?: ElectroInterval['rock'], manualKf?: number): ElectroInterval {
  const p = doc.parameters.electro, record = sourceRecord(well, doc, p.recordId, 'RS')
  const avg = integrate(record, row.from, row.to).mean, normalized = avg === null ? null : avg * p.normalization
  const kf = manualKf ?? (normalized === null ? 0 : Math.max(0, (normalized - p.levels[0]!) * 0.45))
  const lft = kf < p.permeableKf ? 0 : kf < 7 ? 1 : kf < 12 ? 2 : 3
  return { ...row, rock: rock ?? (lft === 0 ? 'clay' : lft === 1 ? 'silt' : 'sand'), resistivity: avg === null ? null : rounded(avg), normalized: normalized === null ? null : rounded(normalized), kf: rounded(kf), lft, manualKf: manualKf !== undefined }
}
export function calculateElectro(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.electro; assertDepth(p.from, p.to, well.depth)
  if (!(p.normalization > 0 && p.length > 0 && p.minThickness >= 0 && p.permeableKf > 0) || p.levels.length < 1 || p.levels.some((v, i) => !Number.isFinite(v) || v <= 0 || i > 0 && v <= p.levels[i - 1]!)) throw new Error('Уровни КС должны строго возрастать; нормировка, длина зонда и Кф — положительные.')
  const record = sourceRecord(well, doc, p.recordId, 'RS'), levels = p.mode === 'overview' ? [p.levels[0]!] : p.levels
  const contacts = new Set([p.from, p.to])
  const shift = (p.probe === 'bottom' ? 1 : -1) * p.length / 2
  for (const level of levels) for (const span of thresholdIntervals(record, p.from, p.to, level / p.normalization)) {
    if (span.from > p.from && span.from < p.to) contacts.add(Math.max(p.from, Math.min(p.to, rounded(span.from + shift))))
    if (span.to > p.from && span.to < p.to) contacts.add(Math.max(p.from, Math.min(p.to, rounded(span.to + shift))))
  }
  // Missing spans receive their own boundaries and remain unknown rather than becoming clay.
  for (let i = 0; i < record.depths.length - 1; i++) if (record.values[i] === null || record.values[i + 1] === null) {
    if (record.depths[i]! > p.from && record.depths[i]! < p.to) contacts.add(record.depths[i]!); if (record.depths[i + 1]! > p.from && record.depths[i + 1]! < p.to) contacts.add(record.depths[i + 1]!)
  }
  const depths = [...contacts].sort((a, b) => a - b), rows: ElectroInterval[] = []
  for (let i = 0; i < depths.length - 1; i++) {
    const from = depths[i]!, to = depths[i + 1]!; if (to - from < 0.001) continue
    const value = valueAt(record, (from + to) / 2), rock = value === null ? 'unknown' : undefined
    const row = electroMetrics(well, doc, { id: `ek-${rows.length}`, from, to }, rock)
    const last = rows.at(-1)
    if (last && (last.rock === row.rock && last.lft === row.lft || to - from < p.minThickness && last.rock !== 'unknown' && row.rock !== 'unknown')) {
      rows[rows.length - 1] = electroMetrics(well, doc, { ...last, to }, last.rock)
    } else rows.push(row)
  }
  if (!rows.some(r => r.resistivity !== null)) throw new Error('В диапазоне нет пригодных данных КС.')
  return result(well, doc, 'electro', rows, 'Локальная модель Кф: max(0; (КС × нормировка − первый уровень) × 0,45).')
}
function gammaTransform(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.gamma
  let diameterFactor = 1
  if (p.useCaliper) {
    const km = sourceRecord(well, doc, p.caliperId, 'CAL'); if (km.stage === 'expanded') throw new Error('КМр после расширения нельзя использовать для поправки ГК. Выберите первичную КМ.')
    diameterFactor = (integrate(km, p.from, p.to).mean ?? p.nominalDiameter) / p.nominalDiameter
  }
  return (value: number) => { let signal = Math.max(0, value - p.background); if (p.transform && signal > 6500) signal = 6500 + Math.sqrt(signal - 6500) * 40; return signal * p.conversion * p.absorption * diameterFactor / (1 - p.moisture / 100) }
}
function gammaCurve(well: InterpretationWell, doc: AlphaDocument) {
  const source = sourceRecord(well, doc, doc.parameters.gamma.recordId, 'GR'), transform = gammaTransform(well, doc)
  let values = source.values.map(v => v === null ? null : transform(v))
  if (doc.parameters.gamma.algorithm === 'weighted') values = values.map((v, i, original) => {
    if (v === null || i < 2 || i > original.length - 3) return v
    const cells = original.slice(i - 2, i + 3); return cells.some(x => x === null) ? v : cells.reduce<number>((s, x, j) => s + x! * [1, 2, 3, 2, 1][j]!, 0) / 9
  })
  else for (let iteration = 0; iteration < 3; iteration++) values = values.map((v, i, previous) => v === null || previous[i - 1] == null || previous[i + 1] == null ? v : Math.max(0, v + 0.15 * (2 * v - previous[i - 1]! - previous[i + 1]!)))
  return { ...source, values }
}
export function oreMetrics(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, morphology: OreInterval['morphology'] = 'bag'): OreInterval {
  const p = doc.parameters.gamma, record = gammaCurve(well, doc)
  const ra = integrate(record, row.from, row.to).mean ?? 0
  const krr = p.krr * (p.useMorphology ? { bag: 1, upper: 0.9, lower: 1.05, remnant: 1.1 }[morphology] : 1)
  const uranium = ra / krr
  const impermeable = doc.electro.rows.filter(r => r.kf < doc.parameters.electro.permeableKf).reduce((s, r) => s + overlap(r, row), 0) > (row.to - row.from) / 2
  return { ...row, ra: rounded(ra, 5), uranium: rounded(uranium, 5), metro: rounded(uranium * (row.to - row.from), 5), krr: rounded(krr), morphology, category: impermeable ? 'technological' : uranium >= p.balanceCutoff ? 'balance' : 'offbalance' }
}
export function calculateGamma(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.gamma; assertDepth(p.from, p.to, well.depth)
  if (!(p.cutoff > 0 && p.balanceCutoff >= p.cutoff && p.krr > 0 && p.conversion > 0 && p.absorption > 0 && p.moisture >= 0 && p.moisture < 100 && p.density > 0 && p.nominalDiameter > 0 && p.gap >= 0 && p.minThickness >= 0)) throw new Error('Проверьте борт, Крр, поправки, влажность и минимальную мощность.')
  if (p.stage === 'final' && (!doc.electro.rows.length || !doc.current.rows.length || alphaStale(well, doc, 'electro') || alphaStale(well, doc, 'current'))) throw new Error('Для окончательной ГК примените актуальные результаты ЭК и ТК.')
  const record = gammaCurve(well, doc)
  const spans = thresholdIntervals(record, p.from, p.to, p.cutoff * p.krr), merged: DepthInterval[] = []
  for (const span of spans) { const last = merged.at(-1); if (last && span.from - last.to <= p.gap && integrate(record, last.to, span.from).covered >= span.from - last.to - 0.0001) last.to = span.to; else merged.push({ ...span }) }
  const rows = merged.filter(s => s.to - s.from >= p.minThickness).map((span, i) => {
    const oxidized = doc.oxidation.some(z => overlap(z, span) > 0), morphology = oxidized ? 'upper' : 'bag'
    return oreMetrics(well, doc, { ...span, id: `gk-${i}` }, morphology)
  })
  return result(well, doc, 'gamma', rows, `Локальный ${p.algorithm === 'iterative' ? 'итерационный' : 'взвешенный'} профиль; коэффициенты не являются промышленной МВИ.`)
}
export function calculateCurrent(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.current; sourceRecord(well, doc, p.recordId, 'TK'); assertDepth(p.from, p.to, well.depth)
  if (!Number.isFinite(p.sumpBottom) || p.sumpBottom < p.to || p.sumpBottom > well.depth) throw new Error('Подошва отстойника должна быть ниже фильтра и внутри скважины.')
  return result(well, doc, 'current', [{ id: 'actual-filter', from: p.from, to: p.to }, ...(p.sumpBottom > p.to ? [{ id: 'actual-sump', from: p.to, to: p.sumpBottom }] : [])], p.note)
}
export function calculateThermal(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.thermal, record = sourceRecord(well, doc, p.recordId, 'TM'); assertDepth(p.backgroundFrom, p.backgroundTo, well.depth)
  if (!p.interpretable) return result<DepthInterval>(well, doc, 'thermal', [], p.note || 'Запись не поддаётся интерпретации.')
  const top = p.autoBackground ? valueAt(record, p.backgroundFrom) : p.backgroundTop, bottom = p.autoBackground ? valueAt(record, p.backgroundTo) : p.backgroundBottom
  if (top === null || bottom === null) throw new Error('Фон пересекает пропуск записи. Задайте известные опорные точки.')
  const bg = (d: number) => top + (bottom - top) * (d - p.backgroundFrom) / (p.backgroundTo - p.backgroundFrom)
  let maximum = 0
  record.depths.forEach((d, i) => { if (d >= p.backgroundFrom && d <= p.backgroundTo && record.values[i] !== null) maximum = Math.max(maximum, record.values[i]! - bg(d)) })
  if (maximum < 0.05) throw new Error('Выраженная термоаномалия не найдена. Отметьте невозможность интерпретации или скорректируйте фон.')
  return result(well, doc, 'thermal', thresholdIntervals(record, p.backgroundFrom, p.backgroundTo, maximum / 2, (v, d) => v - bg(d)).map((s, i) => ({ ...s, id: `cement-${i}` })), 'Границы по половине амплитуды относительно выбранного фона. Это не оценка качества цемента.')
}
export function calculateMetal(well: InterpretationWell, doc: AlphaDocument) {
  const record = sourceRecord(well, doc, doc.parameters.thermal.inductionId, 'IL'), rows: { id: string; depth: number; label: string }[] = []
  for (let i = 1; i < record.values.length - 1; i++) {
    const v = record.values[i], a = record.values[i - 1], b = record.values[i + 1]
    if (v !== null && a !== null && b !== null && v! < -100 && v! < a! && v! <= b!) rows.push({ id: `metal-${rows.length}`, depth: record.depths[i]!, label: 'Металлическое кольцо' })
  }
  return result(well, doc, 'metal', rows, 'Кандидаты по локальным минимумам ИК. Проверьте характер аномалии вручную.')
}
export function gravelSummary(well: InterpretationWell, doc: AlphaDocument, p: CaliperParameters = doc.parameters.caliper) {
  const record = sourceRecord(well, doc, p.recordId, 'CAL'), filter = doc.current.rows.find(r => r.id === 'actual-filter')
  if (!filter) throw new Error('Для расчёта обсыпки примените фактический фильтр по ТК.')
  if (p.gravelMode === 'filter' && alphaStale(well, doc, 'current')) throw new Error('Результат ТК устарел. Примените актуальный фильтр.')
  const from = p.gravelMode === 'manual' ? p.gravelFrom : Math.max(0, filter.from - p.above), to = p.gravelMode === 'manual' ? p.gravelTo : Math.min(well.depth, filter.to + p.below)
  assertDepth(from, to, well.depth)
  const transform = (d: number, pipe: number) => Math.PI / 4 * Math.max(0, d * d - pipe * pipe) / 1e6
  const upper = integrate(record, from, Math.min(to, filter.from), d => transform(d, p.casingDiameter))
  const middle = integrate(record, Math.max(from, filter.from), Math.min(to, filter.to), d => transform(d, p.filterDiameter))
  const lower = integrate(record, Math.max(from, filter.to), to, d => transform(d, p.casingDiameter))
  return { from, to, volume: rounded((upper.area ?? 0) + (middle.area ?? 0) + (lower.area ?? 0), 4), covered: rounded(upper.covered + middle.covered + lower.covered), mean: integrate(record, from, to).mean }
}
export function calculateCaliper(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.caliper; assertDepth(p.from, p.to, well.depth); assertDepth(p.projectFrom, p.projectTo, well.depth)
  if (!(p.target > 0 && p.casingDiameter > 0 && p.filterDiameter > 0 && p.filterDiameter < p.target && p.above >= 0 && p.below >= 0)) throw new Error('Проверьте целевой/наружные диаметры и отступы обсыпки.')
  const record = sourceRecord(well, doc, p.recordId, 'CAL'); if (record.stage !== 'expanded') throw new Error('Выберите КМр после расширения скважины.')
  gravelSummary(well, doc)
  const rows = thresholdIntervals(record, p.from, p.to, p.target).map((r, i) => { const metrics = integrate(record, r.from, r.to); return { ...r, id: `kmr-${i}`, mean: metrics.mean === null ? null : rounded(metrics.mean), minimum: metrics.minimum === null ? null : rounded(metrics.minimum) } })
  return result(well, doc, 'caliper', rows, 'Интервалы с диаметром не меньше целевого. Объём — интеграл площади затрубного пространства по известным точкам.')
}
export function calculateFlow(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.flow, record = sourceRecord(well, doc, p.recordId, 'FLOW'), filter = doc.current.rows.find(r => r.id === 'actual-filter')
  if (!filter || alphaStale(well, doc, 'current')) throw new Error('Примените актуальный фактический фильтр по ТК.')
  if (!(p.total > 0) || ![0.5, 1].includes(p.step)) throw new Error('Общий дебит должен быть положительным, шаг — 0,5 или 1 м.')
  const spans: DepthInterval[] = p.grouping === 'sections' ? doc.sections : p.grouping === 'lithology' ? doc.electro.rows : Array.from({ length: Math.ceil((filter.to - filter.from) / p.step) }, (_, i) => ({ id: `bin-${i}`, from: filter.from + i * p.step, to: Math.min(filter.to, filter.from + (i + 1) * p.step) }))
  if (!spans.length) throw new Error('Задайте секции фильтра или примените литологию.')
  const sorted = spans.map(s => ({ ...s, from: Math.max(filter.from, s.from), to: Math.min(filter.to, s.to) })).filter(s => s.to > s.from).sort((a, b) => a.from - b.from)
  if (sorted.some((s, i) => i > 0 && s.from < sorted[i - 1]!.to - 0.00001)) throw new Error('Расчётные интервалы расхода перекрываются.')
  const values = sorted.map(span => { const a = valueAt(record, span.from), b = valueAt(record, span.to); if (a === null || b === null) throw new Error('Пропуск РМ на границе расчётного интервала. Скорректируйте диапазон или запись.'); return { ...span, delta: Math.max(0, a - b), negative: a < b } })
  const sum = values.reduce((s, r) => s + r.delta, 0); if (!sum) throw new Error('Нет положительного приращения расхода в фильтре.')
  return result(well, doc, 'flow', values.map((r, i) => ({ id: `flow-${i}`, from: rounded(r.from), to: rounded(r.to), rate: p.total * r.delta / sum, percent: 100 * r.delta / sum })), values.some(r => r.negative) ? 'Есть отрицательные приращения: исключены из нормировки. Проверьте исходную расходограмму.' : 'Приращения нормированы к общему дебиту; сумма участков равна Q.')
}
export function calculateControls(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.controls, main = sourceRecord(well, doc, p.mainId), control = sourceRecord(well, doc, p.controlId)
  assertDepth(p.from, p.to, well.depth); assertDepth(p.controlFrom, p.controlTo, well.depth)
  if (main.id === control.id || main.kind !== control.kind || !['GR', 'RS'].includes(main.kind)) throw new Error('Выберите разные записи одного метода ГК или КС.')
  if (p.tolerance < 0 || p.depthTolerance < 0 || p.thicknessTolerance < 0) throw new Error('Допуски должны быть неотрицательными.')
  if (p.type === 'barren' && p.to - p.from < 10) throw new Error('Для безрудной скважины нужен интервал не менее 10 м.')
  if (main.kind === 'RS' && p.to - p.from < 5 * doc.parameters.electro.length) throw new Error('Контроль КС требует интервал не менее пяти длин зонда.')
  const area = p.type === 'reference' ? p.referenceArea : integrate(main, p.from, p.to).area, second = integrate(control, p.controlFrom, p.controlTo).area
  const covered = integrate(main, p.from, p.to).covered >= p.to - p.from - 0.001 && integrate(control, p.controlFrom, p.controlTo).covered >= p.controlTo - p.controlFrom - 0.001
  const relative = area && second !== null && covered ? (second - area) / Math.abs(area) * 100 : null
  const depthError = Math.max(Math.abs(p.from - p.controlFrom), Math.abs(p.to - p.controlTo)), thicknessError = Math.abs(p.to - p.from - (p.controlTo - p.controlFrom))
  const status: ControlPair['status'] = relative === null ? 'unmatched' : Math.abs(relative) > p.tolerance || depthError > p.depthTolerance || thicknessError > p.thicknessTolerance ? 'fail' : 'pass'
  return result(well, doc, 'controls', [{ id: 'control-pair-1', from: p.from, to: p.to, controlFrom: p.controlFrom, controlTo: p.controlTo, mainArea: area, controlArea: second, relative, depthError: rounded(depthError), thicknessError: rounded(thicknessError), status }], 'Локальный профиль сравнения площадей: 100 × (Sконтр − Sосн) / |Sосн|. Допуски задаются явно.')
}
export function zadrSummary(doc: AlphaDocument) {
  const filter = doc.current.rows.find(r => r.id === 'actual-filter'); if (!filter) return null
  let from = Math.max(0, filter.from - doc.zadr.above), to = filter.to + doc.zadr.below
  for (const row of doc.electro.rows.filter(r => r.kf < doc.parameters.electro.permeableKf)) {
    if (row.to <= filter.from && row.to > from) from = row.to
    if (row.from >= filter.to && row.from < to) to = row.from
  }
  const rows = doc.gamma.rows.filter(r => doc.zadr.includeOffbalance || r.category === 'balance'), ore = rows.reduce((s, r) => s + overlap(r, { from, to }), 0), metro = rows.reduce((s, r) => s + overlap(r, { from, to }) * r.uranium, 0)
  const inFilter = rows.reduce((s, r) => s + overlap(r, filter), 0)
  return { from, to, ore, metro, coverage: inFilter / (filter.to - filter.from), dilution: 1 - inFilter / (filter.to - filter.from) }
}

import { ALPHA_CALC_VERSION } from '../model/alphaVersion'
import { allAlphaRecords } from '../model/alphaFixtures'
import type { AlphaDocument, CaliperParameters, DepthInterval, ElectroInterval, MeasurementRecord, Result } from '../model/alphaTypes'
import type { InterpretationWell } from '../model/types'
import { assertDepth, integrate, overlap, rounded, thresholdIntervals, valueAt } from './alphaNumeric'
import { gammaCurve, gammaIntervals } from './alphaGamma'
import { gammaKrr } from './alphaGammaProfile'
export { oreMetrics } from './alphaGamma'
import { controlRows } from './alphaControls'
import { electroCoverage, electroLevels, filtrationClass, kfFor } from './alphaElectro'

type ResultKey = 'electro' | 'gamma' | 'current' | 'thermal' | 'metal' | 'caliper' | 'flow' | 'controls'
export function sourceRecord(well: InterpretationWell, doc: AlphaDocument, id: string, kind?: MeasurementRecord['kind']) {
  const record = allAlphaRecords(well, doc).find(r => r.id === id)
  if (!record || kind && record.kind !== kind) throw new Error('Выберите подходящую запись ГИС. Источник недоступен.')
  return record
}
export function alphaFingerprint(well: InterpretationWell, doc: AlphaDocument, key: ResultKey) {
  const p = key === 'metal' ? doc.parameters.thermal : doc.parameters[key]
  const ids = Object.entries(p).filter(([k]) => k.endsWith('Id')).map(([, value]) => value)
  if (key === 'controls' && doc.parameters.controls.type === 'production') ids.push(doc.parameters.gamma.caliperId)
  const records = allAlphaRecords(well, doc).filter(r => ids.includes(r.id)).map(r => [r.id, r.revision, r.depths, r.values])
  const dependency = (method: 'electro' | 'current') => [doc[method].rows, doc[method].fingerprint, alphaFingerprint(well, doc, method)]
  const dependencies = key === 'controls' && doc.parameters.controls.type === 'production' ? [doc.parameters.gamma, dependency('electro'), doc.oxidation] : key === 'gamma' ? [dependency('electro'), dependency('current'), doc.oxidation] : key === 'caliper' ? dependency('current') : key === 'flow' ? [dependency('current'), doc.sections, doc.parameters.flow.grouping === 'lithology' ? dependency('electro') : null] : null
  const text = JSON.stringify([ALPHA_CALC_VERSION, key, p, records, dependencies]); let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}
export const alphaStale = (well: InterpretationWell, doc: AlphaDocument, key: ResultKey) => !!doc[key].fingerprint && doc[key].fingerprint !== alphaFingerprint(well, doc, key)
const result = <T>(well: InterpretationWell, doc: AlphaDocument, key: ResultKey, rows: T[], note = ''): Result<T> => ({ rows, fingerprint: alphaFingerprint(well, doc, key), version: ALPHA_CALC_VERSION, note })

/** Explicit configurable local profile; source standards require independent verification. */
export function electroMetrics(well: InterpretationWell, doc: AlphaDocument, row: DepthInterval, rock?: ElectroInterval['rock'], manualKf?: number): ElectroInterval {
  const p = doc.parameters.electro, record = sourceRecord(well, doc, p.recordId, 'RS')
  const stats = integrate(record, row.from, row.to), avg = stats.covered >= row.to - row.from - 0.001 ? stats.mean : null, normalized = avg === null ? null : avg * p.normalization
  const kf = manualKf ?? kfFor(doc, normalized)
  const lft = filtrationClass(kf, p.permeableKf)
  return { ...row, rock: rock ?? (avg === null ? 'unknown' : lft === 0 ? 'clay' : lft === 1 ? 'silt' : 'sand'), resistivity: avg === null ? null : rounded(avg), normalized: normalized === null ? null : rounded(normalized), kf: rounded(kf), lft, manualKf: manualKf !== undefined }
}
export function calculateElectro(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.electro; assertDepth(p.from, p.to, well.depth)
  if (!(p.normalization > 0 && p.length > 0 && p.minThickness >= 0 && p.permeableKf > 0 && p.kfA > 0) || p.levels.length < 1 || p.levels.length > 8 || p.levels.some((v, i) => !Number.isFinite(v) || v <= 0 || p.levelMode === 'percent' && v >= 100 || i > 0 && v <= p.levels[i - 1]!)) throw new Error('Уровни КС должны строго возрастать (для процентов — между 0 и 100); нормировка, длина зонда и Кф — положительные.')
  const record = sourceRecord(well, doc, p.recordId, 'RS'), resolved = electroLevels(well, doc), levels = p.mode === 'overview' ? [resolved[0]!] : resolved
  const contacts = new Set([p.from, p.to])
  for (const depth of [record.depths[0]!, record.depths.at(-1)!]) if (depth > p.from && depth < p.to) contacts.add(depth)
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
    const row = electroMetrics(well, doc, { id: `ek-${p.from}-${rows.length}`, from, to }, rock)
    const last = rows.at(-1)
    if (last && (last.rock === row.rock && last.lft === row.lft || to - from < p.minThickness && last.rock !== 'unknown' && row.rock !== 'unknown')) {
      rows[rows.length - 1] = electroMetrics(well, doc, { ...last, to }, last.rock)
    } else rows.push(row)
  }
  if (!rows.some(r => r.resistivity !== null)) throw new Error('В диапазоне нет пригодных данных КС.')
  const outside = doc.electro.rows.flatMap(r => [r.from < p.from ? { ...r, id: `${r.id}-above`, to: Math.min(r.to, p.from) } : null, r.to > p.to ? { ...r, id: `${r.id}-below`, from: Math.max(r.from, p.to) } : null]).filter((r): r is ElectroInterval => !!r && r.to - r.from >= 0.05)
    .map(r => electroMetrics(well, doc, r, r.rock, r.manualKf ? r.kf : undefined))
  return result(well, doc, 'electro', [...outside, ...rows].sort((a, b) => a.from - b.from), `Диапазон ${p.from}–${p.to} м: ${p.mode === 'overview' ? 'обзорная' : 'детальная'} интерпретация; внешние интервалы сохранены. Локальная зависимость Кф: ${p.kfModel === 'power' ? `a × КСнорм^b` : `a × КСнорм + b`}; a=${p.kfA}, b=${p.kfB}. Классы: <Кфгр; <7; ≤12; >12.`)
}
export function calculateGamma(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.gamma; assertDepth(p.from, p.to, well.depth)
  if (!(p.cutoff > 0 && p.balanceCutoff >= p.cutoff && p.krr > 0 && p.conversion > 0 && p.absorption > 0 && p.moisture >= 0 && p.moisture < 100 && p.density > 0 && p.nominalDiameter > 0 && p.gap >= 0 && p.minThickness >= 0)) throw new Error('Проверьте борт, Крр, поправки, влажность и минимальную мощность.')
  if (p.stage === 'final' && (!doc.electro.rows.length || !doc.current.rows.length || alphaStale(well, doc, 'electro') || alphaStale(well, doc, 'current'))) throw new Error('Для окончательной ГК примените актуальные результаты ЭК и ТК.')
  const coverage = integrate(sourceRecord(well, doc, p.recordId, 'GR'), p.from, p.to).covered
  if (coverage <= 0) throw new Error('В выбранном интервале нет пригодных данных ГК.')
  const computed = gammaIntervals(well, doc)
  if (p.stage === 'final' && computed.rows.some(r => !electroCoverage(doc.electro.rows, r.from, r.to))) throw new Error('Для окончательной ГК нужна литология без пропусков на рудных интервалах. Уточните ЭК или используйте предварительный режим.')
  return result(well, doc, 'gamma', computed.rows, `${computed.converged ? 'Контакты стабилизировались.' : 'Достигнут предел уточнений; проверьте контакты вручную.'} Покрытие ГК ${Math.min(100, coverage / (p.to - p.from) * 100).toFixed(1)}%. Локальный ${p.algorithm === 'iterative' ? 'итерационный' : 'взвешенный'} профиль; до ${p.profile.iterations} итераций. Поправки и таблицы — явно заданные коэффициенты прототипа, не промышленная МВИ.`)
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
  if (p.grouping === 'lithology' && alphaStale(well, doc, 'electro')) throw new Error('Для расчёта по литологии примените актуальный результат ЭК.')
  if (!(p.total > 0) || ![0.5, 1].includes(p.step)) throw new Error('Общий дебит должен быть положительным, шаг — 0,5 или 1 м.')
  const spans: DepthInterval[] = p.grouping === 'sections' ? doc.sections : p.grouping === 'lithology' ? doc.electro.rows : Array.from({ length: Math.ceil((filter.to - filter.from) / p.step) }, (_, i) => ({ id: `bin-${i}`, from: filter.from + i * p.step, to: Math.min(filter.to, filter.from + (i + 1) * p.step) }))
  if (!spans.length) throw new Error('Задайте секции фильтра или примените литологию.')
  const sorted = spans.map(s => ({ ...s, from: Math.max(filter.from, s.from), to: Math.min(filter.to, s.to) })).filter(s => s.to > s.from).sort((a, b) => a.from - b.from)
  if (sorted.some((s, i) => i > 0 && s.from < sorted[i - 1]!.to - 0.00001)) throw new Error('Расчётные интервалы расхода перекрываются.')
  if (!sorted.length || Math.abs(sorted[0]!.from - filter.from) > 0.001 || Math.abs(sorted.at(-1)!.to - filter.to) > 0.001 || sorted.some((s, i) => i > 0 && s.from > sorted[i - 1]!.to + 0.001)) throw new Error('Расчётные интервалы должны покрывать весь фактический фильтр без пропусков.')
  if (integrate(record, filter.from, filter.to).covered < filter.to - filter.from - 0.001) throw new Error('Пропуск РМ внутри фильтра. Восстановите запись или скорректируйте фактические границы.')
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
  for (const pair of p.pairs) { assertDepth(pair.from, pair.to, well.depth); assertDepth(pair.controlFrom, pair.controlTo, well.depth) }
  if (p.type === 'reference' && p.referenceArea <= 0) throw new Error('Опорная площадь должна быть положительной.')
  const production = main.kind === 'GR' && p.type === 'production'
  let rows
  if (production) {
    if (doc.parameters.gamma.stage === 'final' && alphaStale(well, doc, 'electro')) throw new Error('Для производственного контроля ГК примените актуальную интерпретацию ЭК.')
    const prepare = (record: MeasurementRecord, from: number, to: number) => {
      const local = { ...doc, parameters: { ...doc.parameters, gamma: { ...doc.parameters.gamma, recordId: record.id, from, to } } }
      return { document: local, curve: gammaCurve(well, local), intervals: gammaIntervals(well, local).rows }
    }
    const first = prepare(main, p.from, p.to), second = prepare(control, p.controlFrom, p.controlTo)
    rows = controlRows(first.curve, second.curve, doc, true, {
      main: first.intervals, control: second.intervals,
      statistics: (side, span) => {
        const prepared = side === 'main' ? first : second, stats = integrate(prepared.curve, span.from, span.to)
        if (stats.mean === null || stats.area === null) return { area: null, covered: stats.covered }
        const morphology = prepared.intervals.find(r => r.from === span.from && r.to === span.to)?.morphology ?? (doc.oxidation.some(z => overlap(z, span) > 0) ? 'upper' : 'bag')
        return { area: stats.area / gammaKrr(prepared.document, span, stats.mean, morphology), covered: stats.covered }
      },
    })
  } else rows = controlRows(main, control, doc, false)
  return result(well, doc, 'controls', rows, production ? 'ГК: сопоставление рудных интервалов по глубине, m и mc. Δmc = 100 × (mcконтр − mcосн) / |mcосн|. Несовпавшие интервалы сохраняются; автоматическое сопоставление требует экспертной проверки.' : 'Сравнение площадей: 100 × (Sконтр − Sосн) / |Sосн|. Допуски задаются явно; несовпавшие интервалы не считаются успешным контролем.')
}
export { zadrSummary } from './alphaGammaReports'

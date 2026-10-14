import type { AlphaDocument, ElectroInterval, RockCode } from '../model/alphaTypes'
import type { InterpretationWell } from '../model/types'
import { allAlphaRecords } from '../model/alphaFixtures'
import { assertDepth, integrate } from './alphaNumeric'

export const rockNames: Record<RockCode, string> = { sand: 'Песок', clay: 'Глина', silt: 'Алеврит', sandstone: 'Песчаник', limestone: 'Известняк', paleozoic: 'Палеозой', unknown: 'Не определён' }
export function electroSource(well: InterpretationWell, doc: AlphaDocument) {
  const record = allAlphaRecords(well, doc).find(r => r.id === doc.parameters.electro.recordId && r.kind === 'RS')
  if (!record) throw new Error('Выберите доступную запись КС.')
  return record
}
/** Source percentages are relative to the maximum normalized RS in the selected horizon. */
export function electroLevels(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.electro, source = electroSource(well, doc)
  const values = source.values.filter((v, i): v is number => v !== null && v > 0 && source.depths[i]! >= p.from && source.depths[i]! <= p.to)
  const maximum = values.length ? Math.max(...values) * p.normalization : 0
  return p.levels.map(value => p.levelMode === 'percent' ? maximum * value / 100 : value)
}
export function calculateNormalization(well: InterpretationWell, doc: AlphaDocument) {
  const p = doc.parameters.electro; assertDepth(p.referenceFrom, p.referenceTo, well.depth)
  const stats = integrate(electroSource(well, doc), p.referenceFrom, p.referenceTo)
  if (stats.mean === null || stats.mean <= 0 || stats.covered < (p.referenceTo - p.referenceFrom) * 0.95) throw new Error('Для нормировки требуется положительный КС с покрытием не менее 95%. Выберите другой опорный интервал.')
  if (!(p.referenceValue > 0)) throw new Error('Стандартный КС должен быть положительным.')
  return p.referenceValue / stats.mean
}
export function filtrationClass(kf: number, permeableKf = 1) {
  return kf < permeableKf ? 0 : kf < 7 ? 1 : kf <= 12 ? 2 : 3
}
export function kfFor(doc: AlphaDocument, value: number | null) {
  const p = doc.parameters.electro
  if (value === null) return 0
  const kf = p.kfModel === 'power' ? p.kfA * Math.pow(Math.max(value, 0), p.kfB) : p.kfA * value + p.kfB
  if (!Number.isFinite(kf)) throw new Error('Зависимость Кф дала нечисловой результат. Проверьте коэффициенты.')
  return Math.max(0, kf)
}
export function electroCoverage(rows: ElectroInterval[], from: number, to: number) {
  const sorted = rows.filter(r => r.to > from && r.from < to).sort((a, b) => a.from - b.from)
  let cursor = from
  for (const row of sorted) {
    if (row.from > cursor + 0.001 || row.rock === 'unknown') return false
    cursor = Math.max(cursor, row.to)
  }
  return cursor >= to - 0.001
}

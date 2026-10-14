import type { AlphaDocument, MeasurementRecord } from '../model/alphaTypes'
import type { InterpretationWell } from '../model/types'
import { allAlphaRecords } from '../model/alphaFixtures'
import { assertDepth } from './alphaNumeric'

export type CurveOperation = 'shift' | 'add' | 'multiply' | 'replace' | 'mask' | 'clip'
export const curveOperationNames: Record<CurveOperation, string> = { shift: 'Сдвиг по глубине', add: 'Прибавить константу', multiply: 'Умножить на константу', replace: 'Заменить значения', mask: 'Вырезать фрагмент (пропуск)', clip: 'Обрезать по интервалу' }
export type CurveOperationInput = { operation: CurveOperation; from: number; to: number; value: number }
export function applyCurveOperation(well: InterpretationWell, doc: AlphaDocument, recordId: string, input: CurveOperationInput) {
  const records = allAlphaRecords(well, doc), source = records.find(r => r.id === recordId)
  if (!source) throw new Error('Выберите доступную исходную или производную запись.')
  if (input.operation !== 'shift') assertDepth(input.from, input.to, well.depth)
  if (!['mask', 'clip'].includes(input.operation) && !Number.isFinite(input.value)) throw new Error('Введите числовой параметр операции.')
  const parentId = source.parentId ?? source.id, siblings = doc.derived.filter(r => r.parentId === parentId)
  let id = source.parentId ? source.id : `derived-${parentId}`
  if (!source.parentId) { let index = 2; while (records.some(r => r.id === id)) id = `derived-${parentId}-${index++}` }
  if (!source.parentId && doc.derived.length >= 50) throw new Error('В документе уже 50 производных записей. Продолжите обработку существующей производной.')
  const next: MeasurementRecord = { ...structuredClone(source), id, parentId, revision: Math.max(source.revision, ...siblings.map(r => r.revision)) + 1, name: source.parentId ? source.name : `${source.name} · правка ${siblings.length + 1}` }
  if (input.operation === 'shift') next.depths = next.depths.map(depth => Number((depth + input.value).toFixed(6)))
  else if (input.operation === 'clip') {
    const indices = next.depths.map((_, i) => i).filter(i => next.depths[i]! >= input.from && next.depths[i]! <= input.to)
    next.depths = indices.map(i => next.depths[i]!); next.values = indices.map(i => next.values[i]!)
  } else next.values = next.values.map((value, i) => {
    if (next.depths[i]! < input.from || next.depths[i]! > input.to) return value
    if (input.operation === 'replace') return input.value
    if (input.operation === 'mask') return null
    if (value === null) return null
    return input.operation === 'add' ? value + input.value : value * input.value
  })
  const keep = next.depths.map((_, i) => i).filter(i => next.depths[i]! >= 0 && next.depths[i]! <= well.depth)
  next.depths = keep.map(i => next.depths[i]!); next.values = keep.map(i => next.values[i]!)
  if (next.depths.length < 2 || next.values.some(v => v !== null && !Number.isFinite(v))) throw new Error('Операция оставляет меньше двух точек или нечисловые значения.')
  if (JSON.stringify([next.depths, next.values]) === JSON.stringify([source.depths, source.values])) throw new Error('Операция не меняет выбранную запись.')
  next.operations.push(`${curveOperationNames[input.operation]}${['mask', 'clip'].includes(input.operation) ? '' : ` ${input.value}`}${input.operation === 'shift' ? ' м; вся запись' : `; ${input.from}–${input.to} м`}`)
  return { document: { ...doc, derived: [...doc.derived.filter(r => r.id !== id), next] }, recordId: id }
}

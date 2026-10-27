import type { AlphaDocument, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
export function correctCurvePoint(well: InterpretationWell, doc: AlphaDocument, recordId: string, index: number, depth: number, value: number) {
  const source = allAlphaRecords(well, doc).find(r => r.id === recordId)
  if (!source || index < 0 || index >= source.depths.length || !Number.isFinite(value) || !Number.isFinite(depth) || depth < 0 || depth > well.depth || index > 0 && depth <= source.depths[index - 1]! || index + 1 < source.depths.length && depth >= source.depths[index + 1]!) throw new Error('Глубина должна находиться между соседними отсчётами, значение должно быть числом.')
  if (!source.parentId && doc.derived.length >= 50) throw new Error('Достигнут предел производных записей. Продолжите правку существующей.')
  let id = source.parentId ? source.id : `point-${source.id}`
  while (!source.parentId && doc.derived.some(r => r.id === id)) id += '-2'
  const record: MeasurementRecord = { ...structuredClone(source), id, parentId: source.parentId ?? source.id, revision: source.revision + 1, name: source.parentId ? source.name : `${source.name} · точки` }
  record.depths[index] = depth; record.values[index] = value
  record.operations.push(`Точка ${index + 1}: ${source.depths[index]} → ${depth} м; ${source.values[index]} → ${value} ${source.unit}`)
  return { document: { ...doc, derived: [...doc.derived.filter(r => r.id !== id), record] }, recordId: id }
}

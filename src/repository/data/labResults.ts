import type { LabResult } from '../../entities/well/model/types'

const baseResults: LabResult[] = [
  { id: 'LAB-1042-01', sampleId: 'SMP-1042-01', analyte: 'U', value: 426, unit: 'мг/кг', method: 'ICP-MS · М-24', analyst: 'Д. Аминова', qaStatus: 'Принят' },
  { id: 'LAB-1042-02', sampleId: 'SMP-1042-01', analyte: 'Mo', value: 18.7, unit: 'мг/кг', method: 'ICP-MS · М-24', analyst: 'Д. Аминова', qaStatus: 'Принят' },
  { id: 'LAB-1042-03', sampleId: 'SMP-1042-03', analyte: 'U', value: 431, unit: 'мг/кг', method: 'ICP-MS · М-24', analyst: 'Д. Аминова', qaStatus: 'На проверке', flag: 'Контрольная' },
]

const store = new Map<string, LabResult[]>()
const clone = (items: LabResult[]) => items.map((item) => ({ ...item }))

export function getLabResults(wellId: string) {
  const data = store.get(wellId) ?? (['WELL-1042', 'WELL-1010-FULL'].includes(wellId) ? baseResults.map((item) => wellId === 'WELL-1010-FULL' ? { ...item, id: item.id.replace('1042', '1010'), sampleId: item.sampleId.replace('1042', '1010') } : item) : [])
  if (!store.has(wellId)) store.set(wellId, clone(data))
  return clone(data)
}

export function setLabResults(wellId: string, results: LabResult[]) {
  store.set(wellId, clone(results))
  return clone(results)
}

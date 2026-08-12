import type { Sample, Well } from '../../entities/well/model/types'

const baseSamples: Sample[] = [
  { id: 'SMP-1042-01', number: 'SARY-1042-118', wellId: 'WELL-1042', from: 278, to: 280, type: 'Керновая', status: 'Результат получен', purpose: 'Химический анализ', linkedIntervalId: 'LITH-02', createdAt: '09 авг 2026' },
  { id: 'SMP-1042-02', number: 'SARY-1042-119', wellId: 'WELL-1042', from: 288, to: 290, type: 'Керновая', status: 'Отправлена в лабораторию', purpose: 'Минералогия', linkedIntervalId: 'LITH-03', createdAt: '10 авг 2026' },
  { id: 'SMP-1042-03', number: 'SARY-1042-QC-01', wellId: 'WELL-1042', from: 306, to: 308, type: 'Контрольная', status: 'Зарегистрирована', purpose: 'Контроль качества', linkedIntervalId: 'LITH-03', createdAt: '10 авг 2026' },
]

const sampleStore = new Map<string, Sample[]>()
const clone = (samples: Sample[]) => samples.map((item) => ({ ...item }))

export function getSamples(well: Well) {
  const stored = sampleStore.get(well.id)
  if (stored) return clone(stored)
  const seeded = ['WELL-1042', 'WELL-1010-FULL'].includes(well.id) ? baseSamples.map((item) => ({ ...item, id: well.id === 'WELL-1010-FULL' ? item.id.replace('1042', '1010') : item.id, number: well.id === 'WELL-1010-FULL' ? item.number.replace('1042', '1010') : item.number, wellId: well.id })) : []
  sampleStore.set(well.id, seeded)
  return clone(seeded)
}

export function setSamples(wellId: string, samples: Sample[]) {
  sampleStore.set(wellId, clone(samples))
  return clone(samples)
}

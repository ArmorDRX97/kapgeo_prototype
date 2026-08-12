import type { ConstructionInterval, CreateWellInput, LabResult, Sample, Well, WellGeologyData, WellTechnicalData } from '../entities/well/model/types'
import { getWellLogs } from './data/wellLogs'
import { primaryWell, wells } from './data/wells'
import { getLabResults, setLabResults } from './data/labResults'
import { getGeologyData, setGeologyData } from './data/wellGeology'
import { getSamples, setSamples } from './data/wellSamples'
import { getTechnicalData, setTechnicalData } from './data/wellTechnical'

const wait = (duration = 280) => new Promise((resolve) => window.setTimeout(resolve, duration))

export async function fetchWells() {
  await wait()
  return [...wells]
}

export async function fetchWell(wellId: string) {
  await wait(180)
  return wells.find((well) => well.id === wellId) ?? primaryWell
}

export async function createWell(input: CreateWellInput): Promise<Well> {
  await wait(420)
  if (wells.some((well) => well.code.toLocaleLowerCase() === input.code.toLocaleLowerCase())) {
    throw new Error('Скважина с таким кодом уже существует в выбранной области.')
  }

  const numericCode = Number(input.code.replace(/\D/g, '')) || 1000
  const well: Well = {
    ...input,
    id: input.code,
    status: 'На проверке',
    quality: 'Среднее',
    block: 'Не назначен',
    cell: '—',
    mapPosition: { x: 18 + (numericCode * 17) % 68, y: 16 + (numericCode * 29) % 70 },
    updatedAt: 'Только что',
    completeness: 68,
    activeTask: 'Заполнить паспорт и проверить координаты',
    aiConflicts: 0,
    version: 1,
  }
  wells.unshift(well)
  return well
}

export async function fetchWellTechnicalData(wellId: string) {
  await wait(160)
  const well = wells.find((item) => item.id === wellId) ?? primaryWell
  return getTechnicalData(well)
}

export async function saveWellPassport(wellId: string, patch: Pick<Well, 'purpose' | 'profile' | 'coordinates' | 'crs' | 'depth' | 'casingDiameter'>, construction: ConstructionInterval[]) {
  await wait(360)
  const well = wells.find((item) => item.id === wellId) ?? primaryWell
  const isNewDraft = well.version === 1 && well.updatedAt === 'Только что'
  Object.assign(well, patch, {
    version: isNewDraft ? 1 : (well.version ?? 7) + 1,
    status: 'На проверке',
    updatedAt: 'Только что',
    completeness: Math.max(well.completeness, 78),
  } satisfies Partial<Well>)
  const current = getTechnicalData(well)
  setTechnicalData(wellId, { ...current, construction })
  return { well: { ...well }, technical: { ...current, construction: construction.map((item) => ({ ...item })) } }
}

export async function saveWellTechnicalData(wellId: string, data: WellTechnicalData) {
  await wait(340)
  return setTechnicalData(wellId, data)
}

export async function fetchWellGeologyData(wellId: string) {
  await wait(180)
  const well = wells.find((item) => item.id === wellId) ?? primaryWell
  return getGeologyData(well)
}

export async function saveWellGeologyData(wellId: string, data: WellGeologyData) {
  await wait(360)
  return setGeologyData(wellId, data)
}

export async function fetchWellSamples(wellId: string) {
  await wait(180)
  const well = wells.find((item) => item.id === wellId) ?? primaryWell
  return getSamples(well)
}

export async function saveWellSamples(wellId: string, samples: Sample[]) {
  await wait(340)
  return setSamples(wellId, samples)
}

export async function fetchLabResults(wellId: string) {
  await wait(180)
  return getLabResults(wellId)
}

export async function saveLabResults(wellId: string, results: LabResult[]) {
  await wait(340)
  return setLabResults(wellId, results)
}

export async function fetchWellLogs(wellId: string) { await wait(180); return getWellLogs(wellId) }

export async function fetchHomeSummary() {
  await wait(220)
  return {
    tasks: [
      { id: 'TASK-118', title: 'Разрешить расхождение AI', object: 'WELL-1042', due: 'Сегодня · 14:00', tone: 'warning' as const },
      { id: 'TASK-121', title: 'Проверить набор ГИС', object: 'WELL-1046', due: 'Сегодня · 17:30', tone: 'info' as const },
      { id: 'TASK-109', title: 'Дополнить литологический интервал', object: 'WELL-1019', due: 'Просрочено на 1 день', tone: 'danger' as const },
    ],
    jobs: [
      { id: 'JOB-42', title: 'AI-интерпретация · 12 скважин', progress: 72, status: 'Выполняется' },
      { id: 'JOB-39', title: 'Импорт LAS · пакет 2026-08-09', progress: 100, status: 'С предупреждениями' },
    ],
  }
}

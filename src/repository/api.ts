import type { ConditionSet, CreateDepositInput, Deposit, GeologicalMasterData, GeologicalSite, UpdateDepositPatch } from '../entities/geology-master/model/types'
import type { WellCoreWorkspace } from '../entities/well-core/model/types'
import type { WellGeologyWorkspace } from '../entities/well-geology/model/types'
import type { WellLogWorkspace } from '../entities/well-log/model/types'
import type { WellOreWorkspace } from '../entities/well-ore/model/types'
import type { CreateWellInput, UpdateWellInput, Well } from '../entities/well/model/types'
import type { AuditEvent } from '../shared/audit/types'
import { createPoint, crsFromLegacy, validateGeometry } from '../shared/scientific/geometry'
import { demoDatabase } from './demo/demoDatabase'
import { demoGeologyMasterRepository } from './demo/geologyMasterRepository'
import { demoPreferencesRepository, type PlatformPreferences } from './demo/demoPreferencesRepository'
import { demoWellCoreRepository } from './demo/wellCoreRepository'
import { demoWellDataRepository } from './demo/wellDataRepository'
import { demoWellGeologyRepository } from './demo/wellGeologyRepository'
import { demoWellLogRepository } from './demo/wellLogRepository'
import { demoWellOreIntervalRepository } from './demo/wellOreIntervalRepository'

const wait = (duration = 280) => new Promise((resolve) => window.setTimeout(resolve, duration))

export async function fetchWells() {
  await wait()
  return demoWellDataRepository.listWells()
}

export async function fetchWell(wellId: string) {
  await wait(180)
  return demoWellDataRepository.getWell(wellId)
}

export async function createWell(input: CreateWellInput): Promise<Well> {
  await wait(420)
  const hasCoordinates = input.bgd
    ? input.bgd.geometry.headX !== null && input.bgd.geometry.headY !== null
    : true
  if (hasCoordinates) {
    const location = createPoint([input.coordinates.x, input.coordinates.y], crsFromLegacy(input.crs))
    const geometryError = validateGeometry(location).find((issue) => issue.severity === 'error')
    if (geometryError) throw new Error(`Координаты устья не прошли проверку: ${geometryError.message}`)
  }

  const existingWells = await demoWellDataRepository.listWells()
  const depositId = input.bgd?.depositId ?? input.depositId ?? 'DEP-SARYTAU'
  const nearDuplicate = hasCoordinates ? existingWells.find((item) => (item.bgd?.depositId ?? 'DEP-SARYTAU') === depositId
    && Math.hypot(item.coordinates.x - input.coordinates.x, item.coordinates.y - input.coordinates.y) < 25) : undefined
  if (nearDuplicate) throw new Error('Пространственный duplicate-check: устье ближе 25 м к ' + nearDuplicate.code + '.')

  const numericCode = Number(input.code.replace(/\D/g, '')) || 1000
  const wellId = depositId !== 'DEP-SARYTAU' ? `WELL-${numericCode}-${depositId.replace(/^DEP-/, '')}` : `WELL-${numericCode}`
  return demoWellDataRepository.createWell({
    ...input,
    id: wellId,
    code: input.bgd ? String(input.bgd.name) : input.code,
    status: input.bgd?.statusHistory.at(-1)?.status ?? 'На проверке',
    quality: 'Среднее',
    block: input.block ?? 'Не назначен',
    cell: input.cell ?? '—',
    mapPosition: { x: 18 + (numericCode * 17) % 68, y: 16 + (numericCode * 29) % 70 },
    updatedAt: 'Только что',
    completeness: 68,
    activeTask: 'Заполнить паспорт и проверить координаты',
    aiConflicts: 0,
    version: 1,
  })
}

export async function updateWell(input: UpdateWellInput): Promise<Well> {
  await wait(360)
  const { wellId, expectedVersion, ...data } = input
  const current = await demoWellDataRepository.getWell(wellId)
  if ((current.version ?? 1) !== expectedVersion) throw new Error('VERSION_CONFLICT: скважина изменена в другой вкладке.')
  return demoWellDataRepository.updateWell(current, {
    ...current,
    ...data,
    id: current.id,
    code: data.bgd ? String(data.bgd.name) : data.code,
    status: data.bgd?.statusHistory.at(-1)?.status ?? current.status,
    version: current.version,
  })
}

export async function fetchWellCoreWorkspace(wellId: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(160)
  return demoWellCoreRepository.get(well)
}

export async function saveWellCoreWorkspace(wellId: string, current: WellCoreWorkspace, next: WellCoreWorkspace, eventType: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(260)
  return demoWellCoreRepository.save(well, current, next, eventType)
}

export async function fetchWellGeologyWorkspace(wellId: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(180)
  return demoWellGeologyRepository.get(well)
}

export async function saveWellGeologyWorkspace(wellId: string, current: WellGeologyWorkspace, next: WellGeologyWorkspace, eventType: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(300)
  return demoWellGeologyRepository.save(well, current, next, eventType)
}

export async function fetchWellOreWorkspace(wellId: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(180)
  return demoWellOreIntervalRepository.get(well)
}

export async function saveWellOreWorkspace(wellId: string, current: WellOreWorkspace, next: WellOreWorkspace, eventType: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(300)
  return demoWellOreIntervalRepository.save(well, current, next, eventType)
}

export async function fetchWellLogWorkspace(wellId: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(180)
  return demoWellLogRepository.get(well)
}

export async function saveWellLogWorkspace(wellId: string, current: WellLogWorkspace, next: WellLogWorkspace, eventType: string) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(280)
  return demoWellLogRepository.save(well, current, next, eventType)
}

export async function beginWellLogImport(wellId: string, current: WellLogWorkspace, source: 'bundled fixture' | 'local demo fixture') {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(280)
  return demoWellLogRepository.beginImport(well, current, source)
}

export async function applyWellLogImport(wellId: string, current: WellLogWorkspace) {
  const well = await demoWellDataRepository.getWell(wellId)
  await wait(340)
  return demoWellLogRepository.applyImport(well, current)
}

export async function fetchPlatformPreferences(): Promise<PlatformPreferences> {
  return demoPreferencesRepository.getPlatform()
}

export async function savePlatformPreferences(next: Omit<PlatformPreferences, 'id' | 'updatedAt'>): Promise<PlatformPreferences> {
  return demoPreferencesRepository.savePlatform(next)
}

export async function fetchDemoAuditEvents(): Promise<AuditEvent[]> {
  const events = await demoDatabase.getAll<AuditEvent>('auditEvents')
  return events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id))
}

export async function fetchGeologicalMasterData(): Promise<GeologicalMasterData> {
  return demoGeologyMasterRepository.getMasterData()
}

export async function createDeposit(input: CreateDepositInput): Promise<Deposit> {
  return demoGeologyMasterRepository.createDeposit(input)
}

export async function updateDeposit(current: Deposit, patch: UpdateDepositPatch): Promise<Deposit> {
  return demoGeologyMasterRepository.updateDeposit(current, patch)
}

export async function deleteDeposit(current: Deposit): Promise<void> {
  return demoGeologyMasterRepository.deleteDeposit(current)
}

export async function recordDepositViewed(depositId: string, actor: { id: string; name: string }): Promise<void> {
  return demoGeologyMasterRepository.recordDepositViewed(depositId, actor)
}

export async function createSite(input: Pick<GeologicalSite, 'depositId' | 'code' | 'name'>): Promise<GeologicalSite> {
  return demoGeologyMasterRepository.createSite(input)
}

export async function createConditionSet(input: Omit<ConditionSet, 'id' | 'status' | 'version'>): Promise<ConditionSet> {
  return demoGeologyMasterRepository.createConditionSet(input)
}

export async function createConditionSetVersion(source: ConditionSet): Promise<ConditionSet> {
  return demoGeologyMasterRepository.createConditionSetVersion(source)
}

export async function saveConditionSet(current: ConditionSet, patch: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'>): Promise<ConditionSet> {
  return demoGeologyMasterRepository.saveConditionSet(current, patch)
}

export async function approveConditionSet(current: ConditionSet): Promise<ConditionSet> {
  return demoGeologyMasterRepository.approveConditionSet(current)
}

export async function publishConditionSet(current: ConditionSet): Promise<ConditionSet> {
  return demoGeologyMasterRepository.publishConditionSet(current)
}

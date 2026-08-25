import { demoDatabase } from './demoDatabase'
import type { DemoLocale } from '../../entities/geology-publication/model/types'

export type GeologyMapWorkspacePreferences = {
  id: 'workspace:geology-map'
  labels: boolean
  contours: boolean
  quality: boolean
  updatedAt: string
}

export type WellRegistryPreferences = {
  id: 'workspace:well-registry'
  grouping: 'site' | 'status'
  savedViews: Array<{ id: string; label: string; search: Record<string, string> }>
  updatedAt: string
}

export type PlatformPreferences = {
  id: 'platform:readiness'
  locale: DemoLocale
  density: 'comfortable' | 'compact'
  contrast: boolean
  reducedMotion: boolean
  performanceProfile: 'small' | 'medium' | 'large'
  browserWidths: Array<390 | 1024 | 1440>
  helpSeen: boolean
  updatedAt: string
}

const defaultMapPreferences: GeologyMapWorkspacePreferences = {
  id: 'workspace:geology-map', labels: true, contours: true, quality: false, updatedAt: '2026-08-24T00:00:00.000Z',
}
const defaultWellRegistryPreferences: WellRegistryPreferences = {
  id: 'workspace:well-registry', grouping: 'site', updatedAt: '2026-08-24T00:00:00.000Z',
  savedViews: [
    { id: 'all', label: 'Все скважины', search: {} },
    { id: 'attention', label: 'Требуют внимания', search: { status: 'Требует внимания' } },
    { id: 'qc', label: 'Ожидают QC', search: { status: 'На проверке' } },
    { id: 'quality', label: 'Проблемы качества', search: { quality: 'Есть проблемы' } },
  ],
}
const defaultPlatformPreferences: PlatformPreferences = {
  id: 'platform:readiness', locale: 'ru', density: 'comfortable', contrast: false, reducedMotion: false,
  performanceProfile: 'small', browserWidths: [], helpSeen: false, updatedAt: '2026-08-24T00:00:00.000Z',
}

export class DemoPreferencesRepository {
  async getGeologyMapWorkspace(): Promise<GeologyMapWorkspacePreferences> {
    const stored = await demoDatabase.get<GeologyMapWorkspacePreferences>('preferences', defaultMapPreferences.id)
    if (stored) return structuredClone(stored)
    await demoDatabase.put('preferences', defaultMapPreferences)
    return structuredClone(defaultMapPreferences)
  }

  async saveGeologyMapWorkspace(next: Omit<GeologyMapWorkspacePreferences, 'id' | 'updatedAt'>): Promise<GeologyMapWorkspacePreferences> {
    const value: GeologyMapWorkspacePreferences = { id: defaultMapPreferences.id, ...next, updatedAt: new Date().toISOString() }
    await demoDatabase.put('preferences', value)
    return structuredClone(value)
  }

  async getWellRegistry(): Promise<WellRegistryPreferences> {
    const stored = await demoDatabase.get<WellRegistryPreferences>('preferences', defaultWellRegistryPreferences.id)
    if (stored) return structuredClone(stored)
    await demoDatabase.put('preferences', defaultWellRegistryPreferences)
    return structuredClone(defaultWellRegistryPreferences)
  }

  async saveWellRegistry(next: Omit<WellRegistryPreferences, 'id' | 'updatedAt'>): Promise<WellRegistryPreferences> {
    const value: WellRegistryPreferences = { id: defaultWellRegistryPreferences.id, ...next, updatedAt: new Date().toISOString() }
    await demoDatabase.put('preferences', value)
    return structuredClone(value)
  }

  async getPlatform(): Promise<PlatformPreferences> {
    const stored = await demoDatabase.get<PlatformPreferences>('preferences', defaultPlatformPreferences.id)
    if (stored) return structuredClone(stored)
    await demoDatabase.put('preferences', defaultPlatformPreferences)
    return structuredClone(defaultPlatformPreferences)
  }

  async savePlatform(next: Omit<PlatformPreferences, 'id' | 'updatedAt'>): Promise<PlatformPreferences> {
    const value: PlatformPreferences = { id: defaultPlatformPreferences.id, ...next, updatedAt: new Date().toISOString() }
    await demoDatabase.put('preferences', value)
    return structuredClone(value)
  }
}

export const demoPreferencesRepository = new DemoPreferencesRepository()

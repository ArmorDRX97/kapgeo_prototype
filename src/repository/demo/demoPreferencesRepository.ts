import { demoDatabase } from './demoDatabase'

export type DemoLocale = 'ru' | 'kk' | 'en'

export type PlatformPreferences = {
  id: 'platform:bgd'
  locale: DemoLocale
  density: 'comfortable' | 'compact'
  contrast: boolean
  reducedMotion: boolean
  currentDepositId?: string
  updatedAt: string
}

const defaultPlatformPreferences: PlatformPreferences = {
  id: 'platform:bgd',
  locale: 'ru',
  density: 'comfortable',
  contrast: false,
  reducedMotion: false,
  currentDepositId: 'DEP-SARYTAU',
  updatedAt: '2026-09-15T00:00:00.000Z',
}

export class DemoPreferencesRepository {
  async getPlatform(): Promise<PlatformPreferences> {
    const current = await demoDatabase.get<Partial<PlatformPreferences> & { id: string }>('preferences', defaultPlatformPreferences.id)
    const legacy = current ?? await demoDatabase.get<Partial<PlatformPreferences> & { id: string }>('preferences', 'platform:readiness')
    const value = { ...defaultPlatformPreferences, ...legacy, id: defaultPlatformPreferences.id }
    if (!current) await demoDatabase.put('preferences', value)
    return structuredClone(value)
  }

  async savePlatform(next: Omit<PlatformPreferences, 'id' | 'updatedAt'>): Promise<PlatformPreferences> {
    const value: PlatformPreferences = { id: defaultPlatformPreferences.id, ...next, updatedAt: new Date().toISOString() }
    await demoDatabase.put('preferences', value)
    return structuredClone(value)
  }
}

export const demoPreferencesRepository = new DemoPreferencesRepository()

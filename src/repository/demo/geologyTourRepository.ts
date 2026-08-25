import type { GeologyTourProgress } from '../../entities/geology-tour/model/types'
import { demoDatabase } from './demoDatabase'

const idFor = (personaId: string) => `tour:geology:${personaId}`

const defaultProgress = (personaId: string): GeologyTourProgress => ({
  id: idFor(personaId),
  personaId,
  stepIndex: 0,
  completedTourIds: [],
  launcherSeen: false,
  updatedAt: '2026-08-25T00:00:00.000Z',
})

export class DemoGeologyTourRepository {
  async get(personaId: string): Promise<GeologyTourProgress> {
    const stored = await demoDatabase.get<GeologyTourProgress>('preferences', idFor(personaId))
    if (stored) return structuredClone(stored)
    const initial = defaultProgress(personaId)
    await demoDatabase.put('preferences', initial)
    return structuredClone(initial)
  }

  async save(personaId: string, next: Omit<GeologyTourProgress, 'id' | 'personaId' | 'updatedAt'>): Promise<GeologyTourProgress> {
    const value: GeologyTourProgress = {
      id: idFor(personaId),
      personaId,
      ...structuredClone(next),
      completedTourIds: [...new Set(next.completedTourIds)],
      updatedAt: new Date().toISOString(),
    }
    await demoDatabase.put('preferences', value)
    return structuredClone(value)
  }
}

export const demoGeologyTourRepository = new DemoGeologyTourRepository()

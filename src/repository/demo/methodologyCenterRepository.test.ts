import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { DemoMethodologyCenterRepository } from './methodologyCenterRepository'

describe('DemoMethodologyCenterRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('persists walkthrough decisions and synthetic formula evidence after reload', async () => {
    const repository = new DemoMethodologyCenterRepository()
    const initial = await repository.get()
    const createdAt = '2026-08-24T12:00:00.000Z'
    const saved = await repository.save(initial, {
      ...initial,
      contours: initial.contours.map((item) => item.id === 'reserves' ? { ...item, decision: 'question', note: 'Уточнить редакцию формул.' } : item),
      methods: initial.methods.map((item) => item.id === 'projection' ? { ...item, runCount: 1, lastArtifactId: 'ART-METHOD-projection-V1-R1' } : item),
      exampleRuns: [{ id: 'RUN-projection-V1-R1', methodId: 'projection', methodVersion: 1, result: 57792, unit: 'т demo-руды', artifactId: 'ART-METHOD-projection-V1-R1', status: 'synthetic-unverified', createdAt }],
    }, 'methodology.example.ran')

    expect((await new DemoMethodologyCenterRepository().get()).version).toBe(saved.version)
    expect((await demoDatabase.getAll<{ kind: string }>('artifacts')).some((item) => item.kind === 'golden-example')).toBe(true)
    expect((await demoDatabase.getAll<DemoRecordLike>('records')).some((item) => item.entityType === 'walkthrough-decision' && item.status === 'question')).toBe(true)
  })

  it('persists definition impact, template and volume profile, rejects stale save and resets baseline', async () => {
    const repository = new DemoMethodologyCenterRepository()
    const initial = await repository.get()
    const saved = await repository.save(initial, { ...initial, definitions: initial.definitions.map((item) => item.id === 'COND-CUTOFF-U' ? { ...item, value: 0.04, version: 2 } : item), selectedTemplateId: 'TPL-SECTION', selectedVolumeProfileId: 'large' }, 'methodology.definition.versioned')

    expect(await demoDatabase.get('preferences', 'methodology:volume-profile')).toMatchObject({ profileId: 'large' })
    expect((await demoDatabase.getAll<{ type: string }>('relations')).some((item) => item.type === 'definition-impact')).toBe(true)
    await expect(repository.save(initial, saved, 'methodology.stale')).rejects.toThrow('VERSION_CONFLICT')
    await demoDatabase.reset()
    expect(await repository.get()).toMatchObject({ version: 1, selectedTemplateId: 'TPL-PASSPORT', selectedVolumeProfileId: 'small' })
  })
})

type DemoRecordLike = { entityType: string; status: string }

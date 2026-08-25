import { afterEach, describe, expect, it } from 'vitest'
import { demoDatabase } from './demoDatabase'
import { demoWellDataRepository } from './wellDataRepository'
import { DemoWellInterpretationRepository } from './wellInterpretationRepository'

describe('DemoWellInterpretationRepository', () => {
  afterEach(async () => { await demoDatabase.reset() })
  it('persists automatic, AI and human-resolved interpretations with lineage', async () => {
    const repository = new DemoWellInterpretationRepository(); const well = await demoWellDataRepository.getWell('WELL-1042'); const initial = await repository.get(well)
    const ai = { id: 'AI-1', modelVersion: 'synthetic-v1', confidence: .82, calibration: 'demo', status: 'proposed' as const, evidence: ['curve'], intervals: [{ id: 'AI-INT-1', kind: 'ai' as const, from: 384, to: 420, title: 'AI', method: 'synthetic', source: 'AI synthetic' as const, state: 'proposed' as const, version: 1, evidence: ['curve'] }] }
    const saved = await repository.save(well, initial, { ...initial, autoProposal: [{ ...initial.permeable[0]!, id: 'AUTO-1', source: 'automatic', state: 'proposed' }], aiProposal: ai, resolved: [{ ...initial.manual[0]!, id: 'RES-1', kind: 'resolved', state: 'accepted' }] }, 'interpretation.ai.created')
    expect((await repository.get(well)).resolved).toHaveLength(1)
    expect((await demoDatabase.getAll<{ type: string }>('relations')).some((item) => item.type === 'resolved-from')).toBe(true)
    expect((await demoDatabase.getAll<{ kind: string }>('artifacts')).some((item) => item.kind === 'ai-evidence')).toBe(true)
    expect(saved.version).toBe(2)
  })
  it('does not overwrite a stale interpretation workspace', async () => {
    const repository = new DemoWellInterpretationRepository(); const well = await demoWellDataRepository.getWell('WELL-1042'); const current = await repository.get(well); const saved = await repository.save(well, current, { ...current, workflow: 'in_review' }, 'interpretation.submitted')
    await expect(repository.save(well, current, saved, 'interpretation.saved')).rejects.toThrow('VERSION_CONFLICT')
  })
})
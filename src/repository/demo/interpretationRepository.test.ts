import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { interpretationWells } from '../../entities/interpretation/model/fixtures'
import { interpretationRepository, interpretationStorageKey } from './interpretationRepository'
import { isNoCore, mappedSamples, splitCore, updateSample } from '../../entities/interpretation/lib/core'

const well = interpretationWells[0]!
const clean = () => { for (const w of interpretationWells) localStorage.removeItem(interpretationStorageKey(w.id)) }
describe('isolated interpretation storage', () => {
  beforeEach(clean); afterEach(clean)
  it('saves and reopens a result without changing other datasets', async () => {
    localStorage.setItem('kapgeo-test-bgd-sentinel', 'unchanged')
    const doc = await interpretationRepository.load(well)
    const saved = interpretationRepository.save(well, { ...doc, logLithology: doc.logLithology.map(r => ({ ...r, note: 'demo edit' })) }, 0)
    expect(saved.revision).toBe(1)
    expect((await interpretationRepository.load(well)).logLithology[0]!.note).toBe('demo edit')
    interpretationRepository.reset(well)
    expect((await interpretationRepository.load(well)).revision).toBe(0)
    expect(localStorage.getItem('kapgeo-test-bgd-sentinel')).toBe('unchanged')
    localStorage.removeItem('kapgeo-test-bgd-sentinel')
  })
  it('rejects stale saves and locked objects', () => {
    interpretationRepository.save(well, well.initial, 0)
    expect(() => interpretationRepository.save(well, well.initial, 0)).toThrow(/другой вкладке/)
    const locked = interpretationWells[1]!
    expect(() => interpretationRepository.save(locked, locked.initial, 0)).toThrow(/просмотра/)
  })
  it('reports corrupt storage instead of silently replacing it', async () => {
    localStorage.setItem(interpretationStorageKey(well.id), '{bad json')
    await expect(interpretationRepository.load(well)).rejects.toThrow(/повреждён/)
    localStorage.setItem(interpretationStorageKey(well.id), JSON.stringify({ ...well.initial, wellId: 'bgd-other-id' }))
    await expect(interpretationRepository.load(well)).rejects.toThrow(/прочитать/)
  })
  it('persists split bindings and edited samples with their original analyses', async () => {
    const split = splitCore(well, well.initial, 'seg-1', 114)
    const changed = updateSample(well, split, { id: 'new-gs', name: 'DEMO-new', kind: 'GS', from: 112, to: 113, assay: 0.2 })
    interpretationRepository.save(well, changed, 0)
    const loaded = await interpretationRepository.load(well)
    expect(mappedSamples(well, loaded).filter(s => s.sampleId === 'sample-1')).toHaveLength(2)
    expect(mappedSamples(well, loaded).filter(s => s.sampleId === 'sample-1').every(s => s.assay === 0.024)).toBe(true)
    expect(loaded.samples?.find(s => s.id === 'new-gs')?.kind).toBe('GS')
  })
  it('extends older bindings with gaps and preserves their positions and saved notes', async () => {
    const legacy = { ...well.initial, sourceRevision: undefined, samples: undefined, revision: 3, core: well.initial.core.filter(s => !isNoCore(s)).map(s => ({ id: s.id, runId: s.runId, from: s.from + (s.id === 'seg-1' ? 1 : 0), to: s.to + (s.id === 'seg-1' ? 1 : 0), reversed: s.reversed })), logLithology: well.initial.logLithology.map(r => ({ ...r, note: 'saved before upgrade' })) }
    localStorage.setItem(interpretationStorageKey(well.id), JSON.stringify(legacy))
    const loaded = await interpretationRepository.load(well)
    expect(loaded.revision).toBe(3)
    expect(loaded.core.find(s => s.id === 'seg-1')?.from).toBe(113)
    expect(loaded.core.some(isNoCore)).toBe(true)
    expect(loaded.logLithology[0]?.note).toBe('saved before upgrade')
    expect(loaded.samples).toHaveLength(6)
    expect(() => interpretationRepository.save(well, loaded, 3)).not.toThrow()
  })
})

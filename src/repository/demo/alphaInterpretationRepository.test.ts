import { beforeEach, describe, expect, it } from 'vitest'
import { alphaRepository, alphaStorageKey } from './alphaInterpretationRepository'
import { interpretationWells } from '../../entities/interpretation/model/fixtures'
import { interpretationRepository, interpretationStorageKey } from './interpretationRepository'
const well = interpretationWells[0]!
describe('Alpha repository isolation and persistence', () => {
  beforeEach(() => localStorage.clear())
  it('roundtrips all results and detects concurrent revision changes', async () => {
    const doc = await alphaRepository.load(well), saved = alphaRepository.save(well, doc, 0)
    expect(await alphaRepository.load(well)).toEqual(saved)
    expect(() => alphaRepository.save(well, doc, 0)).toThrow('другой вкладке')
  })
  it('imports a legacy saved lithology without modifying legacy storage or BGD', async () => {
    const legacy = await interpretationRepository.load(well); legacy.logLithology[0]!.rock = 'limestone'
    interpretationRepository.save(well, legacy, 0); const raw = localStorage.getItem(interpretationStorageKey(well.id))
    localStorage.setItem('bgd-sentinel', 'untouched')
    const doc = await alphaRepository.load(well); expect(doc.electro.note).toContain('перенесена')
    alphaRepository.save(well, doc, 0)
    expect(localStorage.getItem(interpretationStorageKey(well.id))).toBe(raw)
    expect(localStorage.getItem('bgd-sentinel')).toBe('untouched')
  })
  it('preserves malformed saved bytes and prevents locked writes', async () => {
    localStorage.setItem(alphaStorageKey(well.id), '{broken')
    await expect(alphaRepository.load(well)).rejects.toThrow('без изменений')
    expect(localStorage.getItem(alphaStorageKey(well.id))).toBe('{broken')
    const locked = interpretationWells[1]!, doc = await alphaRepository.load(locked)
    expect(() => alphaRepository.save(locked, doc, 0)).toThrow('просмотра')
  })
})

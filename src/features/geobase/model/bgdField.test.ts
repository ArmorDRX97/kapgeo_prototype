import { describe, expect, it } from 'vitest'
import { bgdFieldScene, bgdFieldWell, bgdFieldWells, filterBgdWells } from './bgdField'

describe('BGD field catalogue', () => {
  it('contains 8215 wells and only wells, with a stable route identity', () => {
    expect(bgdFieldWells).toHaveLength(8215)
    expect(bgdFieldScene.objects.every(o => o.kind === 'well')).toBe(true)
    expect(new Set(bgdFieldWells.map(w => w.id)).size).toBe(8215)
    expect(bgdFieldWell(bgdFieldWells[8214]!.id)).toBe(bgdFieldWells[8214])
    expect(bgdFieldWell('unknown')).toBeUndefined()
  })
  it('combines name search, legend types, status and site in one selection', () => {
    const well = bgdFieldWells[8000]!, hiddenTypes = [...new Set(bgdFieldWells.map(w => w.attributes.type))].filter(t => t !== well.attributes.type)
    const result = filterBgdWells({ query: well.name, status: well.status, site: well.site, hiddenTypes })
    expect(result).toContain(well)
    expect(result.every(w => w.attributes.type === well.attributes.type && w.status === well.status && w.site === well.site)).toBe(true)
    expect(filterBgdWells({ query: 'ничего-нет', status: 'all', site: 'all', hiddenTypes: [] })).toHaveLength(0)
  })
})

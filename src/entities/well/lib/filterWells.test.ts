import { describe, expect, it } from 'vitest'
import { wells } from '../../../repository/data/wells'
import { defaultWellFilters, filterWells } from './filterWells'

describe('filterWells', () => {
  it('синхронно применяет предметные фильтры', () => {
    const result = filterWells(wells, {
      ...defaultWellFilters,
      status: 'Требует внимания',
      quality: 'Среднее',
    })

    expect(result.map((well) => well.id)).toEqual(['WELL-1042', 'WELL-1060'])
  })

  it('ищет по профилю, блоку и коду без учёта регистра', () => {
    expect(filterWells(wells, { ...defaultWellFilters, query: 'PR-07' })).toHaveLength(9)
    expect(filterWells(wells, { ...defaultWellFilters, query: 'well-1046' })[0]?.id).toBe('WELL-1046')
  })
})

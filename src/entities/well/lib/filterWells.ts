import type { Well, WellFilters } from '../model/types'

export const defaultWellFilters: WellFilters = {
  query: '',
  status: 'Все',
  type: 'Все',
  quality: 'Все',
  site: 'Все',
}

export function filterWells(wells: Well[], filters: WellFilters) {
  const query = filters.query.trim().toLocaleLowerCase('ru-RU')

  return wells.filter((well) => {
    const searchable = [well.code, well.block, well.cell, well.type, well.site, well.profile]
      .join(' ')
      .toLocaleLowerCase('ru-RU')

    return (!query || searchable.includes(query))
      && (filters.status === 'Все' || well.status === filters.status)
      && (filters.type === 'Все' || well.type === filters.type)
      && (filters.quality === 'Все' || well.quality === filters.quality)
      && (filters.site === 'Все' || well.site === filters.site)
  })
}

export function countActiveWellFilters(filters: WellFilters) {
  return Number(Boolean(filters.query))
    + Number(filters.status !== 'Все')
    + Number(filters.type !== 'Все')
    + Number(filters.quality !== 'Все')
    + Number(filters.site !== 'Все')
}

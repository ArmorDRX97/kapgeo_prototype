import type { QualityState, WellFilters, WellStatus, WellType } from '../../entities/well/model/types'

export type WellSearch = {
  q?: string
  status?: WellStatus
  type?: WellType
  quality?: QualityState
  site?: string
}

const statuses: WellStatus[] = ['Работает', 'На проверке', 'Отключена', 'Требует внимания']
const types: WellType[] = ['Откачная', 'Закачная', 'Наблюдательная', 'Разведочная']
const qualities: QualityState[] = ['Высокое', 'Среднее', 'Есть проблемы']

export function validateWellSearch(search: Record<string, unknown>): WellSearch {
  return {
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    status: statuses.includes(search.status as WellStatus) ? search.status as WellStatus : undefined,
    type: types.includes(search.type as WellType) ? search.type as WellType : undefined,
    quality: qualities.includes(search.quality as QualityState) ? search.quality as QualityState : undefined,
    site: typeof search.site === 'string' && search.site ? search.site : undefined,
  }
}

export function searchToWellFilters(search: WellSearch): WellFilters {
  return {
    query: search.q ?? '',
    status: search.status ?? 'Все',
    type: search.type ?? 'Все',
    quality: search.quality ?? 'Все',
    site: search.site ?? 'Все',
  }
}

export function filtersToWellSearch(filters: WellFilters): WellSearch {
  return {
    q: filters.query || undefined,
    status: filters.status === 'Все' ? undefined : filters.status,
    type: filters.type === 'Все' ? undefined : filters.type,
    quality: filters.quality === 'Все' ? undefined : filters.quality,
    site: filters.site === 'Все' ? undefined : filters.site,
  }
}

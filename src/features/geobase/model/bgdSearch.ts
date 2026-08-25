import type { DepositObjectType } from '../../../entities/geology-master/model/types'

export type BgdVisibilityFilter = 'visible' | 'hidden' | 'all'

export type BgdSearch = {
  q?: string
  type?: DepositObjectType
  visibility?: BgdVisibilityFilter
}

const objectTypes: DepositObjectType[] = ['field', 'area', 'custom']
const visibilityFilters: BgdVisibilityFilter[] = ['visible', 'hidden', 'all']

export function validateBgdSearch(search: Record<string, unknown>): BgdSearch {
  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    type: objectTypes.includes(search.type as DepositObjectType) ? search.type as DepositObjectType : undefined,
    visibility: visibilityFilters.includes(search.visibility as BgdVisibilityFilter) ? search.visibility as BgdVisibilityFilter : undefined,
  }
}
import type { DepositObjectType } from '../../../entities/geology-master/model/types'

export type BgdVisibilityFilter = 'visible' | 'hidden' | 'all'
export type BgdSort = 'code' | 'name' | 'type' | 'coordinateSystem' | 'visibility' | 'updatedAt'
export type BgdSortDirection = 'asc' | 'desc'

export type BgdSearch = {
  q?: string
  type?: DepositObjectType
  visibility?: BgdVisibilityFilter
  sort?: BgdSort
  direction?: BgdSortDirection
  page?: number
  pageSize?: number
}

const objectTypes: DepositObjectType[] = ['field', 'area', 'custom']
const visibilityFilters: BgdVisibilityFilter[] = ['visible', 'hidden', 'all']
const sortFields: BgdSort[] = ['code', 'name', 'type', 'coordinateSystem', 'visibility', 'updatedAt']
const sortDirections: BgdSortDirection[] = ['asc', 'desc']

function positiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function validateBgdSearch(search: Record<string, unknown>): BgdSearch {
  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    type: objectTypes.includes(search.type as DepositObjectType) ? search.type as DepositObjectType : undefined,
    visibility: visibilityFilters.includes(search.visibility as BgdVisibilityFilter) ? search.visibility as BgdVisibilityFilter : undefined,
    sort: sortFields.includes(search.sort as BgdSort) ? search.sort as BgdSort : undefined,
    direction: sortDirections.includes(search.direction as BgdSortDirection) ? search.direction as BgdSortDirection : undefined,
    page: positiveInteger(search.page),
    pageSize: [5, 10, 20, 50].includes(positiveInteger(search.pageSize) ?? 0) ? positiveInteger(search.pageSize) : undefined,
  }
}

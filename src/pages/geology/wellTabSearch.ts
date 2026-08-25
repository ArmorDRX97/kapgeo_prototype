import { validateWellSearch } from './wellSearch'

export type WellTabKey = 'overview' | 'passport' | 'drilling' | 'lithology' | 'logs' | 'samples' | 'technology' | 'equipment' | 'model' | 'documents' | 'audit'

const tabKeys: WellTabKey[] = ['overview', 'passport', 'drilling', 'lithology', 'logs', 'samples', 'technology', 'equipment', 'model', 'documents', 'audit']

export type WellTabSearch = ReturnType<typeof validateWellSearch> & {
  tab?: WellTabKey
}

export function validateWellTabSearch(search: Record<string, unknown>): WellTabSearch {
  const validated = validateWellSearch(search)
  const tab = tabKeys.includes(search.tab as WellTabKey) ? search.tab as WellTabKey : undefined

  return {
    ...validated,
    tab: tab === 'overview' ? undefined : tab,
  }
}

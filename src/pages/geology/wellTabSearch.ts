export type WellTabKey = 'overview' | 'passport' | 'drilling' | 'lithology' | 'logs' | 'samples' | 'technology' | 'equipment' | 'model' | 'documents' | 'audit'

const tabKeys: WellTabKey[] = ['overview', 'passport', 'drilling', 'lithology', 'logs', 'samples', 'technology', 'equipment', 'model', 'documents', 'audit']

export function validateWellTabSearch(search: Record<string, unknown>): { tab?: WellTabKey } {
  return { tab: tabKeys.includes(search.tab as WellTabKey) ? search.tab as WellTabKey : undefined }
}

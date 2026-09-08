export const bgdWellSectionIds = ['description', 'drilling', 'development', 'geology', 'logs'] as const

export type BgdWellSection = typeof bgdWellSectionIds[number]

export type BgdWellSectionSearch = {
  tab?: BgdWellSection
}

export function validateBgdWellSectionSearch(search: Record<string, unknown>): BgdWellSectionSearch {
  const tab = bgdWellSectionIds.includes(search.tab as BgdWellSection)
    ? search.tab as BgdWellSection
    : undefined

  return { tab: tab === 'description' ? undefined : tab }
}

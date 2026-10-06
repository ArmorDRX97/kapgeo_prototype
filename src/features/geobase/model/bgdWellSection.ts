export const bgdWellSectionIds = ['description', 'geometry', 'passport', 'documentation', 'drilling', 'development', 'geology', 'deviation', 'logs', 'core-runs', 'core-samples', 'lithology', 'ore-intervals'] as const

export type BgdWellSection = typeof bgdWellSectionIds[number]

export type BgdWellSectionSearch = {
  tab?: BgdWellSection
  view?: string
}

export const bgdWellViews: Partial<Record<BgdWellSection, readonly string[]>> = {
  description: ['general', 'notes'],
  geology: ['conditions', 'impermeable'],
  'core-runs': ['runs', 'measurements'],
  lithology: ['core', 'log', 'composite'],
}

// Local views are meaningful only inside their owning section.
export function normalizeBgdWellView(tab: BgdWellSection, view: unknown): string | undefined {
  const views = bgdWellViews[tab]
  return typeof view === 'string' && views?.includes(view) && view !== views[0] ? view : undefined
}

export function validateBgdWellSectionSearch(search: Record<string, unknown>): BgdWellSectionSearch {
  const tab = bgdWellSectionIds.includes(search.tab as BgdWellSection)
    ? search.tab as BgdWellSection
    : undefined

  const view = normalizeBgdWellView(tab ?? 'description', search.view)
  return { tab: tab === 'description' ? undefined : tab, ...(view ? { view } : {}) }
}

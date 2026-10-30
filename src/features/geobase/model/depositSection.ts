export const depositSectionIds = ['overview', 'relations', 'conditions', 'wells', 'edit', 'audit'] as const

export type DepositSection = typeof depositSectionIds[number]

export type DepositSectionSearch = {
  section?: DepositSection
  well?: string
}

export function validateDepositSectionSearch(search: Record<string, unknown>): DepositSectionSearch {
  return {
    section: depositSectionIds.includes(search.section as DepositSection)
      ? search.section as DepositSection
      : undefined,
    ...(typeof search.well === 'string' && search.well.length <= 200 && search.well ? { well: search.well } : {}),
  }
}

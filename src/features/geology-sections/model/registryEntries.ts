import type { GeologySection } from '../../../entities/geology-section/model/types'
import type { SectionStage } from '../../../entities/geology-section/model/stages'

/** Registry-only presentation: aliases never become documents in local storage. */
export type SectionRegistryEntry = Pick<GeologySection, 'id' | 'title' | 'kind' | 'year' | 'status'> & {
  documentId: string
  wellCount: number
  depositBody: string
  stage?: SectionStage
}

const areas = ['Западный участок', 'Восточный участок', 'Центральный участок', 'Южный фланг', 'Северный фланг', 'Долинный участок', 'Степной участок', 'Приозёрный участок', 'Речной участок', 'Нагорный участок', 'Дальний участок']

export function sectionRegistryEntries(documents: GeologySection[]): SectionRegistryEntry[] {
  const entries = documents.map(section => ({
    id: section.id, documentId: section.id, title: section.title, kind: section.kind,
    year: section.year, status: section.status, wellCount: section.wellIds.length, stage: section.stage,
    depositBody: section.metadata?.depositBody || 'Без залежи',
  }))
  const shared = entries.find(section => section.id === 'GTR-01')
  if (!shared) return entries
  return [...entries, ...Array.from({ length: 198 }, (_, index) => ({
    ...shared,
    id: `GTR-DEMO-${index + 3}`,
    title: `Северный · профиль ${String(index + 3).padStart(2, '0')} — ${areas[index % areas.length]}`,
  }))]
}

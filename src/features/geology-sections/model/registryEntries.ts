import type { GeologySection } from '../../../entities/geology-section/model/types'
import type { SectionStage } from '../../../entities/geology-section/model/stages'

/** Registry-only presentation: aliases never become documents in local storage. */
export type SectionRegistryEntry = Pick<GeologySection, 'id' | 'title' | 'kind' | 'year' | 'status'> & {
  documentId: string
  wellCount: number
  depositBody: string
  geoBlock: string
  techBlock: string
  createdOn: string
  stage?: SectionStage
}

const areas = ['Западный участок', 'Восточный участок', 'Центральный участок', 'Южный фланг', 'Северный фланг', 'Долинный участок', 'Степной участок', 'Приозёрный участок', 'Речной участок', 'Нагорный участок', 'Дальний участок']

export function sectionRegistryEntries(documents: GeologySection[]): SectionRegistryEntry[] {
  const entries = documents.map(section => ({
    id: section.id, documentId: section.id, title: section.title, kind: section.kind,
    year: section.year, status: section.status, wellCount: section.wellIds.length,
    // The two demo branches classify registry rows; their shared document stays unchanged.
    stage: section.id === 'GTR-01' ? 'detailed' as const : section.id === 'GTR-02' ? 'operationalExploration' as const : section.stage,
    depositBody: section.metadata?.depositBody || 'Без залежи',
    geoBlock: section.metadata?.geoBlock || 'Без геологического блока',
    techBlock: section.metadata?.techBlock || 'Без технологического блока',
    createdOn: section.metadata?.createdOn || `${section.year}-01-01`,
  }))
  const shared = entries.find(section => section.id === 'GTR-01')
  if (!shared) return entries
  return [...entries, ...Array.from({ length: 198 }, (_, index) => ({
    ...shared,
    stage: index < 99 ? 'detailed' as const : 'operationalExploration' as const,
    id: `GTR-DEMO-${index + 3}`,
    title: `Северный · профиль ${String(index + 3).padStart(2, '0')} — ${areas[index % areas.length]}`,
  }))]
}

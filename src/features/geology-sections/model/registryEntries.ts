import type { GeologySection } from '../../../entities/geology-section/model/types'
import type { SectionStage } from '../../../entities/geology-section/model/stages'

/** Registry rows correspond to real local section documents. */
export type SectionRegistryEntry = Pick<GeologySection, 'id' | 'title' | 'kind' | 'year' | 'status'> & {
  documentId: string
  wellCount: number
  depositBody: string
  geoBlock: string
  techBlock: string
  createdOn: string
  stage?: SectionStage
}

export function sectionRegistryEntries(documents: GeologySection[]): SectionRegistryEntry[] {
  const entries = documents.map(section => ({
    id: section.id, documentId: section.id, title: section.title, kind: section.kind,
    year: section.year, status: section.status, wellCount: section.wellIds.length,
    stage: section.stage,
    depositBody: section.metadata?.depositBody || 'Без залежи',
    geoBlock: section.metadata?.geoBlock || 'Без геологического блока',
    techBlock: section.metadata?.techBlock || 'Без технологического блока',
    createdOn: section.metadata?.createdOn || `${section.year}-01-01`,
  }))
  return entries
}

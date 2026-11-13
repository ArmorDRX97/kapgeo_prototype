import type { GeologySection } from '../../../entities/geology-section/model/types'
import type { SectionStage } from '../../../entities/geology-section/model/stages'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { techBlocks } from './blockOptions'

/** Demo entries link to a shared document using their own navigation IDs. */
export type SectionRegistryEntry = Pick<GeologySection, 'id' | 'title' | 'kind' | 'year' | 'status'> & {
  documentId: string
  demo?: true
  wells: { id: string; name: string; segment?: number }[]
  depositBody: string
  geoBlock: string
  techBlock: string
  createdOn: string
  stage?: SectionStage
}

export function sectionRegistryEntries(documents: GeologySection[]): SectionRegistryEntry[] {
  const entries: SectionRegistryEntry[] = documents.map(section => {
    const names = new Map(sectionSources(section).map(well => [well.id, well.name]))
    const segments = new Map(sectionSegments(section).flatMap(segment => segment.wellIds.map(id => [id, segment.index] as const)))
    return {
      id: section.id, documentId: section.id, title: section.title, kind: section.kind,
      year: section.year, status: section.status,
      wells: section.wellIds.map(id => ({ id, name: names.get(id) ?? id, segment: segments.get(id) })),
      stage: section.stage,
      depositBody: section.metadata?.depositBody || 'Без залежи',
      geoBlock: section.metadata?.geoBlock || 'Без геологического блока',
      techBlock: section.metadata?.techBlock || 'Без технологического блока',
      createdOn: section.metadata?.createdOn || `${section.year}-01-01`,
    }
  })
  const reference = entries.find(entry => entry.id === 'GTR-01')
  if (!reference) return entries

  const demoEntries = techBlocks.flatMap(techBlock => Array.from({ length: 4 }, (_, index): SectionRegistryEntry => {
    const number = String(index + 1).padStart(2, '0')
    return {
      ...reference,
      id: `GTR-SAMPLE-${techBlock.slice(3)}-${number}`,
      title: `Разрез ${number}`,
      techBlock,
      demo: true,
    }
  }))
  return [...entries, ...demoEntries]
}

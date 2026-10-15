import { sectionViews, type SectionView } from '../../../entities/geology-section/model/types'
import { sectionStageValues, type SectionStage } from '../../../entities/geology-section/model/stages'

export type SectionSearch = { view?: SectionView; mode?: 'layers' | 'foundation' | 'corrected' | 'uncorrected'; selection?: string; q?: string; kind?: 'main' | 'auxiliary'; stage?: SectionStage; year?: number; body?: string; geoBlock?: string; techBlock?: string; sortBy?: 'date' | 'title'; sortDirection?: 'asc' | 'desc'; groupBy?: 'year' | 'body' | 'kind' | 'stage' | 'geoBlock' | 'techBlock' | 'date' }
export function validateSectionSearch(input: Record<string, unknown>): SectionSearch {
  const requestedView = input.view === 'profile' || input.view === 'wells' ? 'overview' : input.view
  const view = sectionViews.some(v => v.id === requestedView) ? requestedView as SectionView : undefined
  const allowedModes = view === 'technology' ? ['layers', 'foundation'] : view === 'ore' ? ['corrected', 'uncorrected'] : []
  const year = Number(input.year)
  return { view, mode: allowedModes.includes(String(input.mode)) ? input.mode as SectionSearch['mode'] : undefined,
    selection: input.mode === 'rhythm' ? undefined : typeof input.selection === 'string' && input.selection.length < 500 ? input.selection : undefined,
    q: typeof input.q === 'string' && input.q ? input.q.slice(0, 120) : undefined,
    kind: input.kind === 'main' || input.kind === 'auxiliary' ? input.kind : undefined,
    stage: sectionStageValues.includes(input.stage as SectionStage) ? input.stage as SectionStage : undefined,
    year: Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined,
    body: typeof input.body === 'string' && input.body ? input.body.slice(0, 120) : undefined,
    geoBlock: typeof input.geoBlock === 'string' && input.geoBlock ? input.geoBlock.slice(0, 120) : undefined,
    techBlock: typeof input.techBlock === 'string' && input.techBlock ? input.techBlock.slice(0, 120) : undefined,
    sortBy: input.sortBy === 'title' || input.sortBy === 'date' ? input.sortBy : undefined,
    sortDirection: input.sortDirection === 'asc' || input.sortDirection === 'desc' ? input.sortDirection : undefined,
    groupBy: input.groupBy === 'year' || input.groupBy === 'body' || input.groupBy === 'kind' || input.groupBy === 'stage' || input.groupBy === 'geoBlock' || input.groupBy === 'techBlock' || input.groupBy === 'date' ? input.groupBy : undefined }
}

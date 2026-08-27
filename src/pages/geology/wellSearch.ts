import type { QualityState, WellFilters, WellStatus, WellType } from '../../entities/well/model/types'

export const wellWorkspaceFocuses = ['map', 'registry', 'card', 'inspector'] as const

export type WellWorkspaceFocus = (typeof wellWorkspaceFocuses)[number]

export type WellWorkspaceSelection = {
  selectedWellId?: string
  workspaceVersion?: string
  workspaceScenario?: string
  workspaceFocus?: WellWorkspaceFocus
}

export type WellSearch = {
  q?: string
  status?: WellStatus
  type?: WellType
  quality?: QualityState
  site?: string
} & WellWorkspaceSelection

const statuses: WellStatus[] = ['Работает', 'На проверке', 'Отключена', 'Требует внимания']
const types: WellType[] = ['Закачная', 'Откачная', 'Универсальная', 'Контрольная', 'Наблюдательная', 'Гидрогеологическая', 'Разведочная', 'Технического водоснабжения', 'Прочая']
const qualities: QualityState[] = ['Высокое', 'Среднее', 'Есть проблемы']

export function validateWellSearch(search: Record<string, unknown>): WellSearch {
  const selectedWellId = typeof search.selectedWellId === 'string' && /^WELL-[A-Z0-9-]+$/.test(search.selectedWellId)
    ? search.selectedWellId
    : undefined

  const workspaceVersion = typeof search.workspaceVersion === 'string' && search.workspaceVersion.trim() ? search.workspaceVersion : undefined
  const workspaceScenario = typeof search.workspaceScenario === 'string' && search.workspaceScenario.trim()
    ? search.workspaceScenario
    : undefined
  const workspaceFocus = wellWorkspaceFocuses.includes(search.workspaceFocus as WellWorkspaceFocus)
    ? search.workspaceFocus as WellWorkspaceFocus
    : undefined

  return {
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    status: statuses.includes(search.status as WellStatus) ? search.status as WellStatus : undefined,
    type: types.includes(search.type as WellType) ? search.type as WellType : undefined,
    quality: qualities.includes(search.quality as QualityState) ? search.quality as QualityState : undefined,
    site: typeof search.site === 'string' && search.site ? search.site : undefined,
    selectedWellId,
    workspaceVersion,
    workspaceScenario,
    workspaceFocus,
  }
}

export function searchToWellFilters(search: WellSearch): WellFilters {
  return {
    query: search.q ?? '',
    status: search.status ?? 'Все',
    type: search.type ?? 'Все',
    quality: search.quality ?? 'Все',
    site: search.site ?? 'Все',
  }
}

export function searchToWellWorkspace(search: WellSearch): WellWorkspaceSelection {
  return {
    selectedWellId: search.selectedWellId,
    workspaceVersion: search.workspaceVersion,
    workspaceScenario: search.workspaceScenario,
    workspaceFocus: search.workspaceFocus,
  }
}

export function filtersToWellSearch(filters: WellFilters, workspace: WellWorkspaceSelection = {}): WellSearch {
  return {
    q: filters.query || undefined,
    status: filters.status === 'Все' ? undefined : filters.status,
    type: filters.type === 'Все' ? undefined : filters.type,
    quality: filters.quality === 'Все' ? undefined : filters.quality,
    site: filters.site === 'Все' ? undefined : filters.site,
    selectedWellId: workspace.selectedWellId,
    workspaceVersion: workspace.workspaceVersion,
    workspaceScenario: workspace.workspaceScenario,
    workspaceFocus: workspace.workspaceFocus,
  }
}

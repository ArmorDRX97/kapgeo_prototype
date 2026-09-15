import type { MergedOreInterval, MergedOreIntervalSummary, OreInterval, OreIntervalDraft, WellOreWorkspace } from '../../../entities/well-ore/model/types'

const rounded = (value: number, digits = 4) => Number(value.toFixed(digits))

export function oreThickness(interval: Pick<OreInterval, 'from' | 'to'>) {
  return rounded(interval.to - interval.from, 2)
}

export function createOreInterval(id: string, draft: OreIntervalDraft, differentialIds: string[] = []): OreInterval {
  const thickness = oreThickness(draft)
  const content = draft.basis === 'content' ? draft.value : thickness > 0 ? draft.value / thickness : 0
  const meterPercent = draft.basis === 'meterPercent' ? draft.value : draft.value * thickness
  return { id, source: draft.source, element: draft.element, from: draft.from, to: draft.to, content: rounded(content), meterPercent: rounded(meterPercent), permeability: draft.permeability, differentialIds }
}

export function validateOreInterval(interval: OreInterval, workspace: WellOreWorkspace, ignoreId?: string) {
  const errors: string[] = []
  if (!interval.source) errors.push('Выберите источник выделения.')
  if (!interval.element) errors.push('Выберите элемент.')
  if (!Number.isFinite(interval.from) || !Number.isFinite(interval.to) || interval.from < 0 || interval.to <= interval.from) errors.push('Конечная глубина должна быть больше начальной.')
  const overlap = workspace.oreIntervals.find((item) => item.id !== ignoreId && item.source === interval.source && item.element === interval.element && interval.from < item.to && interval.to > item.from)
  if (overlap) errors.push(`Интервал пересекается с ${overlap.from}–${overlap.to} м в том же источнике.`)
  if (interval.content < 0 || interval.meterPercent < 0) errors.push('Содержание и метропроцент не могут быть отрицательными.')
  return errors
}

export function summarizeMergedInterval(group: MergedOreInterval, intervals: OreInterval[]): MergedOreIntervalSummary | null {
  const children = group.oreIntervalIds.map((id) => intervals.find((item) => item.id === id)).filter((item): item is OreInterval => Boolean(item)).sort((a, b) => a.from - b.from)
  if (!children.length) return null
  const first = children[0]!
  const thickness = rounded(children.reduce((total, item) => total + oreThickness(item), 0), 2)
  const meterPercent = rounded(children.reduce((total, item) => total + item.meterPercent, 0))
  return { id: group.id, oreIntervalIds: children.map((item) => item.id), source: first.source, element: first.element, from: first.from, to: children.at(-1)!.to, thickness, content: thickness ? rounded(meterPercent / thickness) : 0, meterPercent, permeability: first.permeability }
}

export function mergedSummaries(workspace: WellOreWorkspace) {
  return workspace.mergedIntervals.map((group) => summarizeMergedInterval(group, workspace.oreIntervals)).filter((item): item is MergedOreIntervalSummary => Boolean(item)).sort((a, b) => a.from - b.from)
}

export function canMergeOreGroups(ids: string[], workspace: WellOreWorkspace) {
  if (ids.length < 2) return false
  const visible = mergedSummaries(workspace).filter((item) => item.source === workspace.selectedSource && item.element === workspace.selectedElement)
  const indexes = ids.map((id) => visible.findIndex((item) => item.id === id)).sort((a, b) => a - b)
  return indexes.every((index, position) => index >= 0 && (position === 0 || index === indexes[position - 1]! + 1))
}

export function mergeOreGroups(ids: string[], workspace: WellOreWorkspace): WellOreWorkspace {
  if (!canMergeOreGroups(ids, workspace)) return workspace
  const selected = workspace.mergedIntervals.filter((item) => ids.includes(item.id))
  const oreIntervalIds = selected.flatMap((item) => item.oreIntervalIds).sort((a, b) => (workspace.oreIntervals.find((item) => item.id === a)?.from ?? 0) - (workspace.oreIntervals.find((item) => item.id === b)?.from ?? 0))
  const merged: MergedOreInterval = { id: `ORI-${workspace.version}-${workspace.mergedIntervals.length + 1}`, oreIntervalIds }
  return { ...workspace, mergedIntervals: [...workspace.mergedIntervals.filter((item) => !ids.includes(item.id)), merged] }
}

export function splitOreGroup(id: string, workspace: WellOreWorkspace): WellOreWorkspace {
  const group = workspace.mergedIntervals.find((item) => item.id === id)
  if (!group || group.oreIntervalIds.length < 2) return workspace
  const singletons = group.oreIntervalIds.map((oreId, index) => ({ id: `ORI-${workspace.version}-${workspace.mergedIntervals.length + index + 1}`, oreIntervalIds: [oreId] }))
  return { ...workspace, mergedIntervals: [...workspace.mergedIntervals.filter((item) => item.id !== id), ...singletons] }
}

export function detachFromOreGroup(groupId: string, boundaryOreId: string, direction: 'top' | 'bottom', workspace: WellOreWorkspace): WellOreWorkspace {
  const group = workspace.mergedIntervals.find((item) => item.id === groupId)
  if (!group || group.oreIntervalIds.length < 2) return workspace
  const ordered = [...group.oreIntervalIds].sort((a, b) => (workspace.oreIntervals.find((item) => item.id === a)?.from ?? 0) - (workspace.oreIntervals.find((item) => item.id === b)?.from ?? 0))
  const boundary = ordered.indexOf(boundaryOreId)
  if (boundary < 0) return workspace
  const detached = direction === 'top' ? ordered.slice(0, boundary + 1) : ordered.slice(boundary)
  const kept = ordered.filter((id) => !detached.includes(id))
  if (!kept.length) return workspace
  const singletons = detached.map((oreId, index) => ({ id: `ORI-${workspace.version}-${workspace.mergedIntervals.length + index + 1}`, oreIntervalIds: [oreId] }))
  return { ...workspace, mergedIntervals: [...workspace.mergedIntervals.filter((item) => item.id !== groupId), { ...group, oreIntervalIds: kept }, ...singletons] }
}

export function areContinuousDifferentials(ids: string[], workspace: WellOreWorkspace) {
  const intervals = ids.map((id) => workspace.differentialIntervals.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => a.from - b.from)
  return intervals.length > 0 && intervals.every((item, index) => !item.oreIntervalId && item.source === workspace.selectedSource && item.element === workspace.selectedElement && (index === 0 || Math.abs(intervals[index - 1]!.to - item.from) < 0.001))
}

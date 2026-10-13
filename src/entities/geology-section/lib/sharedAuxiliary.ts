import type { GeologySection, SharedAuxiliary } from '../model/types'
import { repairSection } from './repair'
export function staleAuxiliary(section: GeologySection, sources: SharedAuxiliary[]) {
  return (section.auxiliary ?? []).filter(a => a.sharedId && sources.some(s => s.id === a.sharedId && s.revision > (a.sourceRevision ?? 0)))
}
export function applySharedAuxiliary(section: GeologySection, sources: SharedAuxiliary[]) {
  const next = { ...section, auxiliary: section.auxiliary?.map(a => {
    const source = sources.find(s => s.id === a.sharedId)
    return source ? { ...a, from: source.from, to: source.to, sourceRevision: source.revision } : a
  }) }
  return repairSection(next)
}

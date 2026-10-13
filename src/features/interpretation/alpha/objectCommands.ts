import type { AlphaDocument, AlphaPage, DepthInterval, MetalMark } from '../../../entities/interpretation/model/alphaTypes'

export function objectRows(doc: AlphaDocument, page: AlphaPage, sub: string): (DepthInterval | MetalMark)[] {
  if (page === 'gamma' && sub === 'oxidation') return doc.oxidation
  if (page === 'thermal' && sub === 'induction') return doc.metal.rows
  if (page === 'thermal' && sub === 'projects') return doc.projects
  if (page === 'flow') return doc.sections
  return page === 'electro' || page === 'gamma' || page === 'current' || page === 'thermal' || page === 'caliper' ? doc[page].rows : []
}
export function removeObject(doc: AlphaDocument, page: AlphaPage, sub: string, id: string) {
  const next = structuredClone(doc)
  if (page === 'gamma' && sub === 'oxidation') next.oxidation = next.oxidation.filter(r => r.id !== id)
  else if (page === 'thermal' && sub === 'induction') next.metal.rows = next.metal.rows.filter(r => r.id !== id)
  else if (page === 'thermal' && sub === 'projects') next.projects = next.projects.filter(r => r.id !== id)
  else if (page === 'flow') next.sections = next.sections.filter(r => r.id !== id)
  else if (page === 'gamma' || page === 'electro' || page === 'thermal' || page === 'caliper') next[page].rows = next[page].rows.filter(r => r.id !== id) as never
  else throw new Error('Фильтр изменяется через параметры ТК.')
  return next
}

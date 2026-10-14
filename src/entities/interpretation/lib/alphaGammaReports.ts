import type { AlphaDocument, DepthInterval, OreInterval } from '../model/alphaTypes'
import { overlap, rounded } from './alphaNumeric'

export const oreCategoryNames = { balance: 'Балансовая', offbalance: 'Забалансовая', technological: 'Технологический забаланс' }
export function oreTotals(rows: OreInterval[], density: number) {
  const thickness = rows.reduce((s, r) => s + r.to - r.from, 0), metro = rows.reduce((s, r) => s + r.metro, 0), raMetro = rows.reduce((s, r) => s + r.ra * (r.to - r.from), 0)
  return { count: rows.length, thickness, uranium: thickness ? metro / thickness : 0, ra: thickness ? raMetro / thickness : 0, raMetro, metro, linearStock: metro * density * 10 }
}
export function totalsByCategory(doc: AlphaDocument) {
  return (['balance', 'offbalance', 'technological'] as const).map(category => ({ category, ...oreTotals(doc.gamma.rows.filter(r => r.category === category), doc.parameters.gamma.density) }))
}
export function stocksByLft(doc: AlphaDocument) {
  const totals = new Map<number, { lft: number; thickness: number; metro: number; kfMass: number; linearStock: number }>()
  for (const ore of doc.gamma.rows) {
    let assigned = 0
    for (const lith of doc.electro.rows) {
      const thickness = overlap(ore, lith); if (!thickness) continue
      assigned += thickness; const lft = lith.rock === 'unknown' ? -1 : lith.lft, row = totals.get(lft) ?? { lft, thickness: 0, metro: 0, kfMass: 0, linearStock: 0 }
      row.thickness += thickness; row.metro += ore.uranium * thickness; row.kfMass += lith.kf * thickness; row.linearStock += ore.uranium * thickness * doc.parameters.gamma.density * 10; totals.set(lft, row)
    }
    const missing = ore.to - ore.from - assigned
    if (missing > 0.001) { const row = totals.get(-1) ?? { lft: -1, thickness: 0, metro: 0, kfMass: 0, linearStock: 0 }; row.thickness += missing; row.metro += ore.uranium * missing; row.linearStock += ore.uranium * missing * doc.parameters.gamma.density * 10; totals.set(-1, row) }
  }
  return [...totals.values()].sort((a, b) => a.lft - b.lft).map(r => ({ lft: r.lft, thickness: r.thickness, metro: r.metro, uranium: r.metro / r.thickness, kf: r.lft < 0 ? null : r.kfMass / r.thickness, linearStock: r.linearStock }))
}
export function zoneSummary(doc: AlphaDocument, zone: Pick<DepthInterval, 'from' | 'to'>) {
  const rows = doc.gamma.rows.filter(r => r.category === 'balance' || r.category === 'offbalance' && doc.zadr.includeOffbalance || r.category === 'technological' && doc.zadr.includeTechnological)
  const ore = rows.reduce((s, r) => s + overlap(r, zone), 0), metro = rows.reduce((s, r) => s + overlap(r, zone) * r.uranium, 0), raMetro = rows.reduce((s, r) => s + overlap(r, zone) * r.ra, 0)
  const known = doc.electro.rows.filter(r => r.rock !== 'unknown'), covered = known.reduce((s, r) => s + overlap(r, zone), 0), kfMass = known.reduce((s, r) => s + overlap(r, zone) * r.kf, 0)
  const length = zone.to - zone.from, coverage = length > 0 ? Math.min(1, ore / length) : 0
  return { ...zone, length, ore, metro, raMetro, uranium: ore ? metro / ore : 0, ra: ore ? raMetro / ore : 0, linearStock: metro * doc.parameters.gamma.density * 10, kf: covered ? kfMass / covered : null, lithologyCoverage: covered, coverage, dilution: 1 - coverage }
}
export function zadrSummary(doc: AlphaDocument, maxDepth = Infinity) {
  const filter = doc.current.rows.find(r => r.id === 'actual-filter'); if (!filter) return null
  let from = Math.max(0, filter.from - doc.zadr.above), to = Math.min(maxDepth, filter.to + doc.zadr.below)
  for (const row of doc.electro.rows.filter(r => r.rock !== 'unknown' && r.kf < doc.parameters.electro.permeableKf)) {
    if (row.from < filter.from && row.to > from) from = Math.max(from, Math.min(filter.from, row.to))
    if (row.to > filter.to && row.from < to) to = Math.min(to, Math.max(filter.to, row.from))
  }
  const zone = zoneSummary(doc, { from, to }), inFilter = zoneSummary(doc, filter)
  return { ...zone, filterCoverage: inFilter.coverage, filterDilution: inFilter.dilution }
}
/** Coverage is bounded by one; tie-break by captured mc, then proximity to existing proposal. */
export function proposeFilter(doc: AlphaDocument, length: number, depth: number) {
  if (!Number.isFinite(length) || length < 0.1 || length > depth) throw new Error('Длина предлагаемого фильтра должна быть от 0,1 м до глубины скважины.')
  if (!doc.gamma.rows.length) throw new Error('Для предложения фильтра нужны рудные интервалы ГК.')
  const candidates = new Set([0, depth - length, doc.filterProposal.from, ...doc.gamma.rows.flatMap(r => [r.from, r.to - length])].map(from => rounded(Math.max(0, Math.min(depth - length, from)))))
  const ranked = [...candidates].map(from => zoneSummary(doc, { from, to: rounded(from + length) })).sort((a, b) => b.coverage - a.coverage || b.metro - a.metro || Math.abs(a.from - doc.filterProposal.from) - Math.abs(b.from - doc.filterProposal.from))
  return { from: ranked[0]!.from, to: ranked[0]!.to }
}

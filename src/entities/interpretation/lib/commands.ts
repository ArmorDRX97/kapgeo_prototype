import { executeIntervalCommand, validateIntervals } from '../../../shared/scientific/intervals/engine'
import type { IntervalPolicy, IntervalRecord } from '../../../shared/scientific/intervals/types'
import type { LithologyInterval, TechnologyInterval } from '../model/types'

export const snapDepth = (depth: number) => Math.round(depth * 10) / 10
export const intervalPolicy = <T extends IntervalRecord>(depth: number): IntervalPolicy<T> => ({ coverage: { from: 0, to: depth }, overlap: 'forbidden', gap: 'allowed', minimumThickness: 0.1, snapResolution: 0.1 })
export function assertRange(from: number, to: number, depth: number) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to > depth || to - from < 0.099) throw new Error('Укажите диапазон внутри скважины с мощностью не менее 0,1 м.')
}
/** Insert/resize overwrites overlaps, preserving the unaffected properties. */
export function overwriteInterval<T extends IntervalRecord>(rows: T[], next: T, depth: number, same: (a: T, b: T) => boolean): T[] {
  const incoming = { ...next, from: snapDepth(next.from), to: snapDepth(next.to) }
  assertRange(incoming.from, incoming.to, depth)
  const pieces: T[] = []
  for (const row of rows) {
    if (row.id === incoming.id) continue
    if (row.to <= incoming.from || row.from >= incoming.to) pieces.push(row)
    else {
      if (row.from < incoming.from) pieces.push({ ...row, to: incoming.from })
      if (row.to > incoming.to) pieces.push({ ...row, id: row.from < incoming.from ? `${row.id}~${incoming.id}` : row.id, from: incoming.to })
    }
  }
  pieces.push(incoming)
  const sorted = pieces.sort((a, b) => a.from - b.from)
  const result: T[] = []
  for (const row of sorted) {
    const previous = result.at(-1)
    if (previous && Math.abs(previous.to - row.from) < 0.001 && same(previous, row)) result[result.length - 1] = { ...previous, to: row.to }
    else result.push(row)
  }
  return result
}
export const mineralsOf = (row: LithologyInterval) => [...new Set([...(row.minerals ?? []), ...row.mineralization.split(/[,;]/)].map(v => v.trim().toLowerCase()).filter(Boolean))].sort()
export const sameLithology = (a: LithologyInterval, b: LithologyInterval) => a.rock === b.rock && JSON.stringify(mineralsOf(a)) === JSON.stringify(mineralsOf(b)) && a.color === b.color && a.note === b.note
export const sameTechnology = (a: TechnologyInterval, b: TechnologyInterval) => a.kind === b.kind
export function deleteIntervals<T extends IntervalRecord>(rows: T[], from: number, to: number, technology = false): T[] {
  const deleted = rows.filter(row => row.from >= from - 0.001 && row.to <= to + 0.001)
  if (!deleted.length) throw new Error('В диапазоне нет полностью попавших интервалов.')
  const result = rows.filter(row => !deleted.some(x => x.id === row.id)).map(row => ({ ...row })).sort((a, b) => a.from - b.from)
  if (technology) for (const row of deleted.sort((a, b) => a.from - b.from)) {
    const above = [...result].reverse().find(r => r.to <= row.from + 0.001)
    if (above && Math.abs(above.to - row.from) < 0.001) { above.to = row.to; Object.assign(above, { source: 'manual' }) }
  }
  if (technology) return result.reduce<T[]>((merged, row) => {
    const previous = merged.at(-1)
    if (previous && Math.abs(previous.to - row.from) < 0.001 && (previous as unknown as TechnologyInterval).kind === (row as unknown as TechnologyInterval).kind) {
      previous.to = row.to; Object.assign(previous, { source: 'manual' })
    } else merged.push(row)
    return merged
  }, [])
  return result
}
export function mergeLithology(rows: LithologyInterval[], id: string, direction: 'above' | 'below'): LithologyInterval[] {
  const ordered = [...rows].sort((a, b) => a.from - b.from), index = ordered.findIndex(row => row.id === id)
  const selected = ordered[index], neighbour = ordered[index + (direction === 'above' ? -1 : 1)]
  if (!selected || !neighbour || Math.abs(direction === 'above' ? neighbour.to - selected.from : selected.to - neighbour.from) > 0.001) throw new Error('Выберите прилегающий интервал.')
  return ordered.filter(row => row.id !== neighbour.id).map(row => row.id === id ? { ...selected, from: Math.min(selected.from, neighbour.from), to: Math.max(selected.to, neighbour.to) } : row)
}
export function splitRow<T extends IntervalRecord>(rows: T[], id: string, at: number, depth: number): T[] {
  return executeIntervalCommand(rows, { type: 'split', id, at, newIds: [id, `${id}~split-${snapDepth(at)}`] }, intervalPolicy(depth))
}
/** Move one shared contact, changing only its two neighbours. */
export function moveContact<T extends IntervalRecord>(rows: T[], id: string, edge: 'from' | 'to', at: number, depth: number): T[] {
  const sorted = [...rows].sort((a, b) => a.from - b.from)
  const index = sorted.findIndex(row => row.id === id), row = sorted[index]
  if (!row) throw new Error('Интервал не найден.')
  const value = snapDepth(at), neighbour = sorted[index + (edge === 'from' ? -1 : 1)]
  const changed = sorted.map(item => item.id === id ? { ...item, [edge]: value } :
    neighbour && item.id === neighbour.id && Math.abs(neighbour[edge === 'from' ? 'to' : 'from'] - row[edge]) < 0.001 ? { ...item, [edge === 'from' ? 'to' : 'from']: value } : item)
  if (validateIntervals(changed, intervalPolicy(depth)).some(issue => issue.severity === 'error')) throw new Error('Контакт должен оставаться между соседними границами, без перекрытия.')
  return changed
}
export { calculateTechnology, meanResistivity } from './calculation'
export { mappedRange, mappedCore, mappedSamples, transformCore } from './core'

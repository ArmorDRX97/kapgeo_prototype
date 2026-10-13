import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSources, stationAtDepth } from '../../../entities/geology-section/lib/correlation'
import { visibleTracks } from '../../../entities/geology-section/lib/columnTracks'
import { defaultColumns } from './presentation'

export type PlotHeader = { id: string; name: string; x: number; y: number; width: number; height: number; anchor: number; from: number; to: number }
export type PlotHeaders = { top: number; cards: PlotHeader[] }

/** Pack well names only; leaders preserve the exact column association. */
export function plotHeaders(section: GeologySection, width: number, left: number, right: number): PlotHeaders {
  const start = 42, end = width - 42, available = end - start, gap = 8
  const cardWidth = Math.min(92, available)
  const project = (x: number) => start + (x - left) / (right - left) * available
  const cards = sectionSources(section).filter(w => section.wellIds.includes(w.id)).flatMap(well => {
    const column = section.columnSettings?.[well.id] ?? section.columnSettings?.all ?? defaultColumns
    const station = stationAtDepth(section, well, Math.max(0, Math.min(well.depth, well.collar.z - section.bottom))).x
    const tracks = visibleTracks(column, well), anchor = project(station)
    const from = anchor + Math.min(0, column.offset), to = anchor + Math.max(0, column.offset + tracks.reduce((n, t) => n + t.width + 5, -5))
    if (to < start || from > end) return []
    return [{ id: well.id, name: well.name, x: 0, y: 8, width: cardWidth, height: 32, anchor, from, to }]
  }).sort((a, b) => a.anchor - b.anchor)
  const perRow = Math.max(1, Math.floor((available + gap) / (cardWidth + gap))), rowHeight = Math.max(0, ...cards.map(c => c.height)) + gap
  cards.forEach((card, index) => {
    const rowStart = Math.floor(index / perRow) * perRow, rowEnd = Math.min(cards.length, rowStart + perRow)
    const minimum = index === rowStart ? start : cards[index - 1]!.x + cardWidth + gap
    const maximum = end - cardWidth - (rowEnd - index - 1) * (cardWidth + gap)
    card.x = Math.max(minimum, Math.min(maximum, (card.from + card.to) / 2 - cardWidth / 2))
    card.y += Math.floor(index / perRow) * rowHeight
  })
  return { top: Math.max(64, 8 + Math.ceil(cards.length / perRow) * rowHeight + 16), cards }
}

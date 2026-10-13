import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { sourceFor, stationAtDepth } from '../../../entities/geology-section/lib/correlation'
import { visibleTracks, trackName } from '../../../entities/geology-section/lib/columnTracks'
import { defaultColumns } from './presentation'

type HeaderTrack = { id: string; name: string; lines: string[]; x: number; y: number }
export type PlotHeader = { id: string; name: string; x: number; y: number; width: number; height: number; anchor: number; from: number; to: number; tracks: HeaderTrack[] }
export type PlotHeaders = { top: number; cards: PlotHeader[] }

// Conservative text metrics keep 12px labels readable without squeezing SVG text.
function wrap(text: string, width: number) {
  const max = Math.max(1, Math.floor(width / 7)), lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > max) { lines.push(line); line = '' }
    let rest = word
    while (rest.length > max) { if (line) { lines.push(line); line = '' } lines.push(rest.slice(0, max)); rest = rest.slice(max) }
    line = line ? `${line} ${rest}` : rest
  }
  if (line) lines.push(line)
  return lines
}

/** Pack horizontal well legends; leaders preserve the exact column association. */
export function plotHeaders(section: GeologySection, width: number, left: number, right: number): PlotHeaders {
  const start = 42, end = width - 42, available = end - start, gap = 8
  const cardWidth = Math.min(148, Math.max(120, (available - gap) / 2), available)
  const project = (x: number) => start + (x - left) / (right - left) * available
  const cards = sectionWellSources.filter(w => section.wellIds.includes(w.id)).flatMap(original => {
    const well = sourceFor(section, original), column = section.columnSettings?.[well.id] ?? section.columnSettings?.all ?? defaultColumns
    const station = stationAtDepth(section, well, Math.max(0, Math.min(well.depth, well.collar.z - section.bottom))).x
    const tracks = visibleTracks(column, well), anchor = project(station)
    const from = anchor + Math.min(0, column.offset), to = anchor + Math.max(0, column.offset + tracks.reduce((n, t) => n + t.width + 5, -5))
    if (to < start || from > end) return []
    let x = 0, y = 42, rowHeight = 16
    const labels = tracks.map(track => {
      const name = trackName(track, well), lines = wrap(name, cardWidth - 20), labelWidth = Math.min(cardWidth - 20, Math.max(...lines.map(l => l.length * 7)))
      if (x && x + labelWidth > cardWidth - 20) { x = 0; y += rowHeight; rowHeight = 16 }
      const label = { id: track.id, name, lines, x: x + 10, y }
      rowHeight = Math.max(rowHeight, lines.length * 16); x += labelWidth + 12
      return label
    })
    return [{ id: well.id, name: well.name, x: 0, y: 8, width: cardWidth, height: labels.length ? y + rowHeight - 4 : 32, anchor, from, to, tracks: labels }]
  }).sort((a, b) => a.anchor - b.anchor)
  const perRow = Math.max(1, Math.floor((available + gap) / (cardWidth + gap))), rowHeight = Math.max(0, ...cards.map(c => c.height)) + gap
  cards.forEach((card, index) => {
    const rowStart = Math.floor(index / perRow) * perRow, rowEnd = Math.min(cards.length, rowStart + perRow)
    const minimum = index === rowStart ? start : cards[index - 1]!.x + cardWidth + gap
    const maximum = end - cardWidth - (rowEnd - index - 1) * (cardWidth + gap)
    card.x = Math.max(minimum, Math.min(maximum, (card.from + card.to) / 2 - cardWidth / 2))
    card.y += Math.floor(index / perRow) * rowHeight
  })
  return { top: Math.max(96, 8 + Math.ceil(cards.length / perRow) * rowHeight + 16), cards }
}

import type { MapObject, MapPoint, MapProject } from './model'
import { wellTypes } from './wellSymbols'

export const FIELD_ID = 'MAP-FIELD'
export const FIELD_WELL_COUNT = 8215
export const FIELD_LAYOUT_VERSION = 2
const round = (n: number) => Math.round(n * 100) / 100
const noise = (row: number, col: number, salt = 0) => { const n = Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233 + salt * 37.17) * 43758.5453; return n - Math.floor(n) }
type Station = { patch: number; row: number; col: number; block: number; object: MapObject }
type Patch = { x: number; y: number; length: number; width: number; count: number; angle: number }
const style = (stroke: string, fill = 'none', width = 1): MapObject['style'] => ({ stroke, fill, width, paperWidth: .15, dash: 'solid', opacity: .08 })
function object(id: string, name: string, kind: MapObject['kind'], layerId: string, nodes: MapPoint[], stroke: string, closed = false, fill = 'none'): MapObject {
  return { id, name, kind, layerId, shape: 'straight', closed, parts: [{ id: `${id}-part`, nodes }], label: { visible: true, dx: 8, dy: -8 }, attributes: { type: '', depth: 0, value: 0, note: '' }, style: style(stroke, fill) }
}
function anchored(station: Station, id: string): MapPoint {
  const p = station.object.parts[0]!.nodes[0]!
  return { id, x: p.x, y: p.y, anchor: { wellId: station.object.id, target: 'collar' } }
}
// Dense, interrupted diagonal panels; a separate northern group and sparse exploration traverses.
// These shapes follow the supplied screenshots, not actual surveyed coordinates.
const mainCounts = [850, 950, 780, 660, 820, 750, 680, 630, 480]
const patches: Patch[] = mainCounts.map((count, i) => {
  const u = [0, 570, 1170, 1830, 2460, 3120, 3760, 4380, 5050][i]!, offset = Math.sin(i * 1.7) * 140
  return { x: 58900 - .78 * u + .63 * offset, y: 93600 + .63 * u + .78 * offset, length: [1000, 1100, 980, 1150, 1050, 1000, 950, 900, 850][i]!, width: [850, 1000, 900, 1150, 1000, 900, 750, 700, 450][i]!, count, angle: -.9 + Math.sin(i) * .12 }
}).concat([
  { x: 62100, y: 96800, length: 850, width: 650, count: 520, angle: -.95 },
  { x: 61100, y: 97500, length: 850, width: 550, count: 420, angle: -.85 },
  { x: 60150, y: 98200, length: 750, width: 400, count: 260, angle: -.8 },
])
function patchPoint(patch: Patch, u: number, v: number) {
  return { x: round(patch.x + Math.sin(patch.angle) * u + Math.cos(patch.angle) * v), y: round(patch.y + Math.cos(patch.angle) * u - Math.sin(patch.angle) * v) }
}
function generate(): MapProject {
  const stations: Station[] = [], occupied = new Map<string, { x: number; y: number }[]>()
  const add = (patch: number, row: number, col: number, x: number, y: number, sparse = false) => {
    const cx = Math.floor(x / 10), cy = Math.floor(y / 10)
    for (let a = cx - 1; a <= cx + 1; a++) for (let b = cy - 1; b <= cy + 1; b++) if (occupied.get(`${a}:${b}`)?.some(p => Math.hypot(p.x - x, p.y - y) < 8)) return false
    const cell = occupied.get(`${cx}:${cy}`) ?? []; cell.push({ x, y }); occupied.set(`${cx}:${cy}`, cell)
    const block = 110 + patch * 10 + Math.floor(row / 10), roll = noise(row, col, patch + 4)
    const kind = sparse ? roll < .72 ? 'Разведочная' : roll < .88 ? 'Наблюдательная' : 'Проектная' : roll < .05 ? 'Наблюдательная' : roll < .09 ? 'Разведочная' : roll < .14 ? 'Проектная' : roll < .55 ? 'Откачная' : 'Закачная'
    const symbol = wellTypes.find(t => t.name === kind)!, id = `field-well-p${patch}-${row}-${col}`, i = stations.length
    const well = object(id, `${block}.${row + 1}.${col + 1}`, 'well', 'field-wells', [{ id: `${id}-collar`, x, y }, { id: `${id}-bottom`, x: round(x + Math.sin(i * .63) * (1 + i % 4)), y: round(y + Math.cos(i * .41) * (1 + i % 5)) }], symbol.color)
    well.attributes = { type: kind, depth: round(510 + patch * 5 + Math.sin(row / 9) * 28 + noise(row, col, 7) * 22), value: round(.4 + noise(row, col, patch) * 7.5), note: `${sparse ? 'Разведочный профиль' : `Блок ${block}`} · мынкудукский горизонт` }
    stations.push({ patch, row, col, block, object: well }); return true
  }
  patches.forEach((patch, pi) => {
    const spacing = Math.sqrt(patch.length * patch.width * .43 / patch.count), rows = Math.ceil(patch.length / spacing), cols = Math.ceil(patch.width / spacing)
    const candidates = Array.from({ length: rows * cols }, (_, i) => {
      const row = Math.floor(i / cols), col = i % cols, u = row / (rows - 1) * 2 - 1, v = col / (cols - 1) * 2 - 1
      const hole = pi % 3 === 1 && ((u - .05) / .42) ** 2 + ((v - .24) / .3) ** 2 < 1
      const lane = row % 11 === 8 && col > cols * .18 && col < cols * .8
      return { row, col, u, v, missing: hole || lane || noise(row, col, pi + 13) < .035, score: u * u + ((v - .18 * Math.sin(u * 4 + pi)) / (1 + .16 * Math.sin(u * 5 + pi))) ** 2 + noise(row, col, 6) * .12 }
    }).filter(p => !p.missing).sort((a, b) => a.score - b.score)
    let added = 0
    for (const c of candidates) {
      const p = patchPoint(patch, c.u * patch.length / 2 + (noise(c.row, c.col, 2) - .5) * spacing * .42, c.v * patch.width / 2 + (noise(c.row, c.col, 3) - .5) * spacing * .48)
      if (add(pi, c.row, c.col, p.x, p.y)) added++
      if (added === patch.count) break
    }
    if (added !== patch.count) throw new Error(`Недостаточно позиций в участке ${pi}`)
  })
  // Widely spaced pickets and outlying wells are deliberately separate from the production panels.
  for (let i = 0; stations.length < FIELD_WELL_COUNT; i++) {
    const group = Math.floor(i / 16), slot = i % 16, u = noise(group, slot, 15) * 5600, v = (noise(group, slot, 16) < .12 ? -1 : 1) * (650 + noise(group, slot, 17) * 1800)
    const x = round(i < 240 ? 58900 - .78 * u + .63 * v : i < 320 ? 60400 + noise(group, slot, 18) * 2100 : 54800 - (group - 20) * 130 - slot * 38 + (noise(group, slot, 9) - .5) * 90)
    const y = round(i < 240 ? 93600 + .63 * u + .78 * v : i < 320 ? 96900 + noise(group, slot, 19) * 2400 : 97500 + (group - 20) * 220 + slot * 110 + (noise(group, slot, 10) - .5) * 110)
    add(12, group, slot, x, y, true)
  }
  const objects: MapObject[] = [], panels = new Map<string, Station[]>()
  for (const station of stations) if (station.patch < patches.length) {
    const key = `${station.patch}-${Math.floor(station.row / 9)}-${Math.floor(station.col / 14)}`, members = panels.get(key) ?? []
    members.push(station); panels.set(key, members)
  }
  for (const [key, wells] of panels) {
    if (wells.length < 8) continue
    const rows = [...new Set(wells.map(w => w.row))].sort((a, b) => a - b), sorted = (row: number) => wells.filter(w => w.row === row).sort((a, b) => a.col - b.col)
    const boundary = [...rows.map(row => sorted(row)[0]!), ...rows.map(row => sorted(row).at(-1)!).reverse()].filter((w, i, all) => all.findIndex(v => v.object.id === w.object.id) === i)
    const id = `field-block-${key}`, block = object(id, `ГБ-${key}`, 'block', 'field-blocks', boundary.map((w, i) => anchored(w, `${id}-n${i}`)), '#4e8a82', true)
    block.style.width = 1.1; objects.push(block)
    const connections = object(`field-links-${key}`, `Соединения ${key}`, 'contour', 'field-connections', [], '#8b9e9a')
    connections.parts = rows.flatMap(row => { const line = sorted(row); return line.length < 2 ? [] : [{ id: `${id}-row-${row}`, nodes: line.map((w, i) => anchored(w, `${id}-row-${row}-n${i}`)) }] })
    connections.label.visible = false; connections.style.width = .85; if (connections.parts.length) objects.push(connections)
  }
  for (const pi of patches.keys()) {
    const members = stations.filter(w => w.patch === pi), rows = [...new Set(members.map(w => w.row))].sort((a, b) => a - b)
    for (let ri = 2; ri < rows.length - 1; ri += 5) {
      const wells = members.filter(w => w.row === rows[ri]).sort((a, b) => a.col - b.col)
      if (wells.length < 4) continue
      const index = objects.filter(o => o.kind === 'profile').length, id = `field-profile-p${pi}-${ri}`
      const vertices = wells.filter((_, i) => i % 8 === 0 || i === wells.length - 1)
      const profile = object(id, `Р-${String(index + 1).padStart(3, '0')}`, 'profile', 'field-profiles', vertices.map((w, i) => anchored(w, `${id}-v${i}`)), '#3d6fa3')
      profile.style.width = 1.35
      profile.segmentWells = Object.fromEntries(vertices.slice(1).map((w, i) => [`${id}-v${i}:${id}-v${i + 1}`, wells.filter(v => v.col >= vertices[i]!.col && v.col <= w.col).map(v => v.object.id)]))
      objects.push(profile)
    }
  }
  // Continuous interpretation envelopes follow the main belt, rather than encircling each panel.
  for (let band = 0; band < 3; band++) {
    const edges = [-1, 1].map(side => Array.from({ length: 38 }, (_, i) => {
      const t = i / 37, u = -420 + t * 5920, offset = Math.sin(u / 650 * 1.7) * 110
      const spread = (570 - band * 145) * (.5 + .5 * Math.sin(Math.PI * t)) * (1 + .14 * Math.sin(t * 32 + band))
      return { x: round(58900 - .78 * u + .63 * (offset + side * spread)), y: round(93600 + .63 * u + .78 * (offset + side * spread)) }
    }))
    const id = `field-area-belt-${band}`, ring = [...edges[0]!, ...edges[1]!.reverse()]
    const area = object(id, ['Продуктивный горизонт', 'Область минерализации', 'Рудная зона'][band]!, 'contour', 'field-areas', ring.map((p, i) => ({ ...p, id: `${id}-n${i}` })), ['#5d9c86', '#b1954f', '#738faf'][band]!, true, ['#d2e8df', '#e9dfb5', '#d5e3f2'][band]!)
    area.shape = 'cardinal'; area.label.visible = false; area.style.width = 1.05; objects.unshift(area)
  }
  return { schemaVersion: 1, sceneVersion: 2, fieldVersion: FIELD_LAYOUT_VERSION, id: FIELD_ID, title: 'Северный · план месторождения', deposit: 'Полигон Северный', lens: 'Мынкудукский горизонт', date: '2026-10-22', author: 'Ирина Иванова', description: 'Фонд скважин северного и центрального участков, профили разведки и геологические блоки.', scope: 'north', locked: false, revision: 0, underlay: null, print: { paper: 'A3', landscape: true, scale: 25000 }, layers: [
    { id: 'field-areas', parentId: null, name: 'Геологические области', visible: true, locked: false },
    { id: 'field-blocks', parentId: null, name: 'Геологические блоки', visible: true, locked: false },
    { id: 'field-connections', parentId: null, name: 'Соединения скважин', visible: true, locked: false },
    { id: 'field-profiles', parentId: null, name: 'Профили разрезов', visible: true, locked: false },
    { id: 'field-wells', parentId: null, name: 'Скважины', visible: true, locked: false },
  ], objects: [...objects, ...stations.map(w => w.object)] }
}
export const depositField = generate()
export const fieldProfiles = depositField.objects.filter(o => o.kind === 'profile')
export function fieldSectionScene(): MapProject {
  return { ...depositField, layers: depositField.layers.filter(l => l.id === 'field-wells' || l.id === 'field-profiles'), objects: depositField.objects.filter(o => o.kind === 'well' || o.kind === 'profile') }
}

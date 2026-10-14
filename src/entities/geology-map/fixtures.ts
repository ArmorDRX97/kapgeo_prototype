import { type MapObject, type MapPoint, type MapProject } from './model'
import { cleanMapScene } from './cleanScene'

export function emptyMap(id: string, title: string): MapProject {
  return { schemaVersion: 1, id, title, deposit: 'Полигон Северный', lens: '2.1', date: '2026-10-14', author: 'Ирина Иванова', description: '', scope: 'north', locked: false, revision: 0, layers: [{ id: `${id}-base`, parentId: null, name: 'Построения', visible: true, locked: false }], objects: [], underlay: null, print: { paper: 'A3', landscape: true, scale: 2000 } }
}
function sceneObject(id: string, layerId: string, name: string, kind: MapObject['kind'], pairs: number[][], closed = false, shape: MapObject['shape'] = 'straight', stroke = '#59646e', fill = 'none'): MapObject {
  const nodes = pairs.map(([x, y], i) => ({ id: `${id}-n${i}`, x: x!, y: y! }))
  // Every source ID and value is deterministic across resets.
  return { id, layerId, kind, shape, name, closed, attributes: { type: '', depth: 0, value: 0, note: '' }, label: { visible: true, dx: 8, dy: -8 }, parts: [{ id: `${id}-part`, nodes }], style: { stroke, fill, width: 1.1, paperWidth: .15, dash: 'solid', opacity: .62 } }
}
export function legacyInitialMaps(): MapProject[] {
  const p = emptyMap('MAP-01', 'Северный · геологическое картирование')
  p.description = 'Обзор скважин, профилей и ручных картографических построений.'
  p.layers = [
    { id: 'geo', parentId: null, name: 'Геологические границы', visible: true, locked: false },
    { id: 'zones', parentId: 'geo', name: 'Области картирования', visible: true, locked: false },
    { id: 'boundary', parentId: 'geo', name: 'Линии окисления', visible: true, locked: false },
    { id: 'blocks', parentId: null, name: 'Контуры блоков', visible: true, locked: false },
    { id: 'profiles', parentId: null, name: 'Линии профилей', visible: true, locked: false },
    { id: 'wells', parentId: null, name: 'Скважины', visible: true, locked: false },
  ]
  const lobes = [[60545, 94780], [60590, 94720], [60645, 94755], [60680, 94850], [60725, 94880], [60770, 94960], [60745, 95010], [60675, 95025], [60630, 95115], [60655, 95205], [60610, 95255], [60555, 95205], [60520, 95105], [60565, 95010], [60540, 94920]]
  for (const [i, ratio, color] of [[0, 1, '#aacfe5'], [1, .84, '#9fda9a'], [2, .65, '#f4e48b'], [3, .4, '#e4a0c6']] as const) {
    const coords = lobes.map(([x, y]) => [60620 + (x! - 60620) * ratio, 94970 + (y! - 94970) * ratio])
    p.objects.push(sceneObject(`area-${i}`, 'zones', ['Область А · внешний контур', 'Область Б · промежуточная', 'Область В · внутренняя', 'Область Г · локальная'][i]!, 'contour', coords, true, 'cardinal', '#667154', color))
  }
  const hole = sceneObject('area-hole', 'zones', 'Область с внутренним исключением', 'contour', [[60760, 95080], [60820, 95115], [60810, 95220], [60740, 95250], [60710, 95170]], true, 'cardinal', '#a16d4b', '#e9c5a1')
  hole.parts.push({ id: 'hole-part', nodes: [[60755, 95150], [60780, 95165], [60765, 95200], [60740, 95185]].map(([x, y], i) => ({ id: `hole-n${i}`, x: x!, y: y! })) })
  p.objects.push(hole)
  for (let i = 0; i < 4; i++) p.objects.push(sceneObject(`oxid-${i}`, 'boundary', `Граница окисления ${i + 1}`, 'contour', lobes.filter((_, n) => n < 8).map(([x, y]) => [x! + 45 + i * 25, y! - 35 + Math.sin(i + y!) * 12]), false, 'cardinal', '#cb5b68'))
  p.objects.push(sceneObject('bezier-1', 'boundary', 'Плавная граница · Безье', 'contour', [[60485, 94700], [60590, 94740], [60510, 94980], [60630, 95020], [60710, 95070], [60715, 95170], [60820, 95280]], false, 'bezier', '#4bb7b0'))
  for (let i = 0; i < 9; i++) {
    p.objects.push(sceneObject(`profile-${i}`, 'profiles', `ПР-${String(i + 1).padStart(2, '0')}`, 'profile', [[60440 + i * 42, 94655], [60590 + i * 32, 94910], [60635 + i * 33, 95330]], false))
    if (i < 5) p.objects.push(sceneObject(`block-${i}`, 'blocks', `Блок 2.1-${i + 1}`, 'block', [[60465 + i * 55, 94710 + i * 32], [60530 + i * 55, 94735 + i * 30], [60620 + i * 42, 95280], [60550 + i * 45, 95290]], true, 'straight', '#4bb7b0'))
  }
  for (let row = 0; row < 12; row++) for (let col = 0; col < 16; col++) {
    if ((row * 7 + col * 3) % 17 === 0) continue
    const i = row * 16 + col, x = 60430 + row * 32 + Math.sin(i * 1.9) * 14, y = 94660 + col * 42 + row * 8 + Math.cos(i * 1.4) * 14
    const w = sceneObject(`well-${i}`, 'wells', `С-${String(1001 + i)}`, 'well', [[x, y], [x + Math.sin(i) * (8 + i % 14), y + Math.cos(i * .6) * (5 + i % 11)]])
    w.attributes = { type: ['Разведочная', 'Закачная', 'Откачная', 'Наблюдательная'][i % 4]!, depth: 140 + i % 65, value: Number((.3 + Math.abs(Math.sin(i * .7)) * 3).toFixed(2)), note: '' }
    w.style.stroke = i % 4 === 1 ? '#3b8b8e' : i % 4 === 2 ? '#bd5a71' : '#525c65'
    p.objects.push(w)
  }
  return [p, { ...p, id: 'MAP-02', title: 'Северный · утверждённая схема', locked: true }, emptyMap('MAP-03', 'Восточный фланг · новый план')]
}
export function initialMaps(): MapProject[] { return legacyInitialMaps().map(p => p.objects.length ? cleanMapScene(p) : { ...p, sceneVersion: 2 }) }
export function translated(o: MapObject, dx: number, dy: number): MapObject { return { ...o, parts: o.parts.map(p => ({ ...p, nodes: p.nodes.map(n => n.anchor ? n : { ...n, x: n.x + dx, y: n.y + dy }) })) } }
export function changedNode(o: MapObject, nodeId: string, patch: Partial<Pick<MapPoint, 'x' | 'y' | 'anchor'>>): MapObject { return { ...o, parts: o.parts.map(p => ({ ...p, nodes: p.nodes.map(n => n.id !== nodeId || n.anchor && !patch.anchor ? n : { ...n, ...patch, anchor: patch.anchor }) })) } }

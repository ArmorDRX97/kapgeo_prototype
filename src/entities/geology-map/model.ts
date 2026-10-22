import { z } from 'zod'

export const anchorSchema = z.object({ wellId: z.string().min(1), target: z.enum(['collar', 'bottom']) })
export type MapAnchor = z.infer<typeof anchorSchema>
export const pointSchema = z.object({ id: z.string().min(1), x: z.number().finite().min(-1e8).max(1e8), y: z.number().finite().min(-1e8).max(1e8), anchor: anchorSchema.optional() })
export type MapPoint = z.infer<typeof pointSchema>
export type XY = Pick<MapPoint, 'x' | 'y'>
export type SnapPoint = XY & { anchor?: MapAnchor }
export const gridSchema = z.object({ step: z.number().min(0).max(10000), color: z.string().regex(/^#[\da-f]{6}$/i), width: z.number().min(.2).max(3), dx: z.number().finite().min(-10000).max(10000), dy: z.number().finite().min(-10000).max(10000) })
export type MapGrid = z.infer<typeof gridSchema>
export const defaultMapGrid: MapGrid = { step: 0, color: '#dbe3e8', width: .6, dx: 0, dy: 0 }
export const objectSchema = z.object({
  id: z.string().min(1), layerId: z.string(), name: z.string().trim().min(1).max(120),
  kind: z.enum(['well', 'profile', 'block', 'contour']), shape: z.enum(['straight', 'cardinal', 'bezier']), closed: z.boolean(),
  parts: z.array(z.object({ id: z.string(), nodes: z.array(pointSchema).max(5000) })).min(1).max(100),
  style: z.object({ stroke: z.string().regex(/^#[\da-f]{6}$/i), fill: z.string().regex(/^(none|#[\da-f]{6})$/i), width: z.number().min(.1).max(8), paperWidth: z.number().min(.05).max(2).default(.2), dash: z.enum(['solid', 'dash', 'dot']), opacity: z.number().min(0).max(1) }),
  label: z.object({ visible: z.boolean(), dx: z.number().finite().min(-500).max(500), dy: z.number().finite().min(-500).max(500) }),
  attributes: z.object({ type: z.string().max(120), depth: z.number().min(0).max(3000), value: z.number().finite(), note: z.string().max(2000) }),
  segmentWells: z.record(z.string(), z.array(z.string()).max(5000)).optional(),
})
export type MapObject = z.infer<typeof objectSchema>
export const projectSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1), title: z.string().trim().min(1).max(120), deposit: z.literal('Полигон Северный'), lens: z.string().max(60), date: z.string(), author: z.string().max(120), description: z.string().max(2000),
  scope: z.literal('north'), locked: z.boolean(), revision: z.number().int().min(0),
  sceneVersion: z.literal(2).optional(), fieldVersion: z.union([z.literal(1), z.literal(2)]).optional(), migrationNote: z.string().max(500).optional(), grid: gridSchema.optional(),
  layers: z.array(z.object({ id: z.string().min(1), parentId: z.string().nullable(), name: z.string().trim().min(1).max(120), visible: z.boolean(), locked: z.boolean() })).max(100),
  objects: z.array(objectSchema).max(20000),
  underlay: z.object({ key: z.string(), name: z.string(), x: z.number().finite(), y: z.number().finite(), width: z.number().positive().max(1e6), height: z.number().positive().max(1e6), angle: z.number().finite(), opacity: z.number().min(0).max(1), visible: z.boolean() }).nullable(),
  print: z.object({ paper: z.enum(['A4', 'A3', 'A2', 'A1', 'A0']), landscape: z.boolean(), scale: z.number().min(100).max(100000) }),
}).superRefine((p, ctx) => {
  const ids = [...p.layers.map(l => l.id), ...p.objects.map(o => o.id)]
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Повторяющиеся идентификаторы.' })
  for (const layer of p.layers) {
    const visited = new Set([layer.id]); let parent = layer.parentId
    while (parent) { if (visited.has(parent) || !p.layers.some(l => l.id === parent)) { ctx.addIssue({ code: 'custom', message: 'Неверное дерево слоёв.' }); break }; visited.add(parent); parent = p.layers.find(l => l.id === parent)!.parentId }
  }
  const names = new Set<string>()
  const wellsById = new Map(p.objects.filter(o => o.kind === 'well').map(o => [o.id, o]))
  for (const o of p.objects) {
    if (!p.layers.some(l => l.id === o.layerId)) ctx.addIssue({ code: 'custom', message: 'Объект без слоя.' })
    const problem = objectIssues(o)
    for (const message of problem) ctx.addIssue({ code: 'custom', message: `${o.name}: ${message}` })
    if (o.kind === 'well') { const name = o.name.toLocaleLowerCase(); if (names.has(name)) ctx.addIssue({ code: 'custom', message: 'Номер скважины уже существует.' }); names.add(name) }
    for (const node of o.parts.flatMap(part => part.nodes)) if (node.anchor) {
      const well = wellsById.get(node.anchor.wellId)
      const target = well?.parts[0]?.nodes[node.anchor.target === 'collar' ? 0 : 1]
      if (!target || o.kind === 'well' || Math.hypot(node.x - target.x, node.y - target.y) > .001) ctx.addIssue({ code: 'custom', message: 'Привязка точки не соответствует скважине.' })
    }
    if (o.segmentWells) {
      const keys = new Set(o.parts.flatMap(part => part.nodes.slice(1).map((node, i) => `${part.nodes[i]!.id}:${node.id}`)))
      for (const [key, ids] of Object.entries(o.segmentWells)) if (!keys.has(key) || new Set(ids).size !== ids.length || ids.some(id => !wellsById.has(id))) ctx.addIssue({ code: 'custom', message: 'Проверьте состав скважин сегмента.' })
    }
  }
})
export type MapProject = z.infer<typeof projectSchema>
export type MapLayer = MapProject['layers'][number]
export const kindNames = { well: 'Скважина', profile: 'Профиль разреза', block: 'Геоблок', contour: 'Построение' }
export const shapeNames = { straight: 'Прямые', cardinal: 'Кардинальный сплайн', bezier: 'Кубическая Безье' }
export const newId = () => crypto.randomUUID()
export const point = (x: number, y: number): MapPoint => ({ id: newId(), x, y })
export function objectIssues(o: MapObject): string[] {
  if (!o.name.trim()) return ['Укажите название.']
  if (new Set(o.parts.map(p => p.id)).size !== o.parts.length || new Set(o.parts.flatMap(p => p.nodes.map(n => n.id))).size !== o.parts.reduce((n, p) => n + p.nodes.length, 0)) return ['Повторяются ID частей или узлов объекта.']
  for (const part of o.parts) {
    if (part.nodes.some(n => !Number.isFinite(n.x) || !Number.isFinite(n.y))) return ['Координаты должны быть конечными числами.']
    if (part.nodes.length < (o.closed ? 3 : 2)) return ['Недостаточно точек в части.']
    if (o.shape === 'bezier' && (part.nodes.length < 4 || (part.nodes.length - 1) % 3 !== 0)) return ['Для Безье нужны 4, 7, 10… точек: якорь и пары управляющих точек.']
    if (new Set(part.nodes.map(n => n.id)).size !== part.nodes.length) return ['Повторяются ID узлов.']
  }
  if (o.kind === 'well' && (o.parts.length !== 1 || o.parts[0]!.nodes.length !== 2)) return ['У скважины должны быть устье и забой.']
  return []
}
export function layerVisible(p: MapProject, id: string): boolean { const l = p.layers.find(l => l.id === id); return !!l && l.visible && (!l.parentId || layerVisible(p, l.parentId)) }
export function layerEditable(p: MapProject, id: string): boolean { const l = p.layers.find(l => l.id === id); return !!l && !l.locked && l.visible && (!l.parentId || layerEditable(p, l.parentId)) }
export function orderedLayers(p: MapProject): MapLayer[] { const visit = (parent: string | null): MapLayer[] => p.layers.filter(l => l.parentId === parent).flatMap(l => [l, ...visit(l.id)]); return visit(null) }
export function makeObject(layerId: string, kind: MapObject['kind'], nodes: MapPoint[], shape: MapObject['shape'] = 'straight'): MapObject {
  return { id: newId(), layerId, kind, name: kindNames[kind], shape: kind === 'well' ? 'straight' : shape, closed: kind === 'block' || kind === 'contour', parts: [{ id: newId(), nodes }], style: { stroke: kind === 'profile' ? '#4e5866' : '#bf5267', fill: kind === 'block' || kind === 'contour' ? '#f4cd85' : 'none', width: 1.2, paperWidth: .2, dash: 'solid', opacity: .35 }, label: { visible: true, dx: 8, dy: -8 }, attributes: { type: kind === 'well' ? 'Разведочная' : '', depth: 0, value: 0, note: '' } }
}

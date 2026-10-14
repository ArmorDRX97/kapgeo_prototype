import { makeObject, objectIssues, objectSchema, point, type MapObject, type XY } from './model'
export type ImportTransform = { x: number; y: number; scale: number; angle: number; flipY: boolean }
export type SvgImport = { objects: MapObject[]; warnings: string[] }
function pathParts(d: string): { parts: XY[][]; closed: boolean; curved: boolean } {
  if (d.length > 300000) throw new Error('Слишком длинный path.')
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? []
  if (d.replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[\s,]/g, '')) throw new Error('Неверная запись path.')
  let i = 0, cmd = '', current: XY = { x: 0, y: 0 }, start = current, curved = false
  const parts: { nodes: XY[]; closed: boolean }[] = []
  let part: typeof parts[number] | undefined
  const number = () => { const value = Number(tokens[i++]); if (!Number.isFinite(value) || Math.abs(value) > 1e7) throw new Error('Неверная координата SVG.'); return value }
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i]!)) cmd = tokens[i++]!
    if (!'MmLlHhVvCcQqZz'.includes(cmd) || !cmd) throw new Error(`Команда ${cmd || '?'} не поддерживается. Разрешены M/L/H/V/C/Q/Z.`)
    const rel = cmd === cmd.toLowerCase(), code = cmd.toUpperCase(), base = current
    const xy = (): XY => ({ x: number() + (rel ? base.x : 0), y: number() + (rel ? base.y : 0) })
    if (code === 'Z') { if (!part) throw new Error('Z без начала части.'); part.closed = true; current = start; cmd = ''; continue }
    if (i >= tokens.length || /^[a-zA-Z]$/.test(tokens[i]!)) throw new Error('Не хватает координат команды.')
    if (code === 'M') { current = xy(); start = current; part = { nodes: [current], closed: false }; parts.push(part); cmd = rel ? 'l' : 'L'; continue }
    if (!part) throw new Error('Первая команда должна быть M.')
    if (code === 'C') { const b = xy(), c = xy(), end = xy(); part.nodes.push(b, c, end); current = end; curved = true }
    else if (code === 'Q') { const control = xy(), end = xy(); part.nodes.push({ x: base.x + (control.x - base.x) * 2 / 3, y: base.y + (control.y - base.y) * 2 / 3 }, { x: end.x + (control.x - end.x) * 2 / 3, y: end.y + (control.y - end.y) * 2 / 3 }, end); current = end; curved = true }
    else { const end = code === 'H' ? { x: number() + (rel ? base.x : 0), y: base.y } : code === 'V' ? { x: base.x, y: number() + (rel ? base.y : 0) } : xy(); part.nodes.push({ x: base.x + (end.x - base.x) / 3, y: base.y + (end.y - base.y) / 3 }, { x: base.x + (end.x - base.x) * 2 / 3, y: base.y + (end.y - base.y) * 2 / 3 }, end); current = end }
    if (parts.reduce((n, p) => n + p.nodes.length, 0) > 5000) throw new Error('Слишком много узлов в path.')
  }
  if (!parts.length || parts.some(p => p.closed !== parts[0]!.closed)) throw new Error('Не поддерживается смешение открытых и закрытых частей одного path.')
  return { parts: parts.map(p => curved ? p.nodes : p.nodes.filter((_, n) => n % 3 === 0)), closed: parts[0]!.closed, curved }
}
export function transformSvgPoint(p: XY, t: ImportTransform): XY {
  const e = p.x * t.scale, n = p.y * t.scale * (t.flipY ? -1 : 1), a = t.angle * Math.PI / 180
  return { x: t.x + n * Math.cos(a) - e * Math.sin(a), y: t.y + e * Math.cos(a) + n * Math.sin(a) }
}
export function importSvg(source: string, layerId: string, transform: ImportTransform): SvgImport {
  if (source.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG слишком большой или содержит недопустимую декларацию.')
  if (![transform.x, transform.y, transform.scale, transform.angle].every(Number.isFinite) || transform.scale <= 0) throw new Error('Проверьте параметры преобразования.')
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Файл не является корректным SVG.')
  const paths = Array.from(doc.querySelectorAll('path'))
  if (paths.length > 100) throw new Error('В одном импорте разрешено до 100 path.')
  const objects: MapObject[] = [], warnings: string[] = []
  if (doc.querySelector('script, foreignObject, image, use, text, rect, circle, ellipse, polygon, polyline, line')) warnings.push('Импортируются только path. Тексты, изображения, фигуры и исполняемые элементы не переносятся.')
  paths.forEach((node, i) => {
    try {
      let ancestor: Element | null = node
      while (ancestor) { if (ancestor.hasAttribute('transform')) throw new Error('transform не поддерживается: перед импортом преобразуйте координаты path в редакторе.'); ancestor = ancestor.parentElement }
      const parsed = pathParts(node.getAttribute('d') ?? '')
      const parts = parsed.parts.map(nodes => ({ id: crypto.randomUUID(), nodes: nodes.map(n => { const p = transformSvgPoint(n, transform); return point(p.x, p.y) }) }))
      const o = makeObject(layerId, 'contour', parts[0]!.nodes, parsed.curved ? 'bezier' : 'straight')
      o.parts = parts; o.closed = parsed.closed; o.name = (node.getAttribute('id') || `SVG · контур ${i + 1}`).slice(0, 120)
      const stroke = node.getAttribute('stroke'), fill = node.getAttribute('fill')
      if (stroke && /^#[\da-f]{6}$/i.test(stroke)) o.style.stroke = stroke
      o.style.fill = parsed.closed ? fill && /^#[\da-f]{6}$/i.test(fill) ? fill : '#c4ddce' : 'none'
      if (!objectSchema.safeParse(o).success || objectIssues(o).length) throw new Error('Некорректная геометрия или координаты вне допустимого диапазона.')
      objects.push(o)
    } catch (e) { warnings.push(`Path ${i + 1}: ${e instanceof Error ? e.message : 'не удалось прочитать'}`) }
  })
  if (!objects.length) throw new Error(`Нет поддерживаемых контуров. ${warnings.join(' ')}`)
  return { objects, warnings }
}

import { worldToScreen, plotMargin, type Camera, type Size } from './geometry'
import type { MapObject } from './model'
import { wellSymbol, wellTypes } from './wellSymbols'

/** Batch the background symbols by type; selected geometry stays in the SVG interaction layer. */
export function paintWells(canvas: HTMLCanvasElement, wells: MapObject[], camera: Camera, size: Size, selected: string | undefined, labels: boolean, values: boolean, hoveredId?: string, focusIds?: string[], forceLabels = false) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2), ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = Math.round(size.width * ratio); canvas.height = Math.round(size.height * ratio)
  ctx.scale(ratio, ratio); ctx.clearRect(0, 0, size.width, size.height)
  const radius = Math.max(1.2, Math.min(4.2, camera.scale * 9))
  const focused = focusIds ? new Set(focusIds) : null
  ctx.globalAlpha = focused ? .28 : 1
  const visible = wells.map(o => ({ o, a: worldToScreen(o.parts[0]!.nodes[0]!, camera, size), b: worldToScreen(o.parts[0]!.nodes[1]!, camera, size) })).filter(({ a }) => a.x >= plotMargin.left - 8 && a.x <= size.width - plotMargin.right + 8 && a.y >= plotMargin.top - 8 && a.y <= size.height - plotMargin.bottom + 8)
  for (const type of [...wellTypes, { name: '', color: '#697781' }]) {
    const group = visible.filter(v => type.name ? v.o.attributes.type === type.name : !wellTypes.some(t => t.name === v.o.attributes.type))
    ctx.strokeStyle = type.color; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.15; ctx.beginPath()
    for (const { a } of group) { ctx.moveTo(a.x + radius, a.y); ctx.arc(a.x, a.y, radius, 0, Math.PI * 2) }
    ctx.fill(); ctx.stroke()
    if (radius >= 2) { ctx.beginPath(); for (const { a, b } of group) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(a.x - radius * .6, a.y); ctx.lineTo(a.x + radius * .6, a.y); ctx.moveTo(a.x, a.y - radius * .6); ctx.lineTo(a.x, a.y + radius * .6) }; ctx.stroke() }
  }
  const occupied = new Set<string>()
  ctx.globalAlpha = 1
  ctx.font = '11px "Segoe UI", sans-serif'
  for (const { o, a } of visible) {
    const active = o.id === selected, hovered = o.id === hoveredId, emphasis = focused?.has(o.id)
    if (hovered || emphasis) {
      const r = Math.max(2, radius * (hovered ? 1.18 : 1.25)), color = hovered ? '#2563bd' : wellSymbol(o.attributes.type).color
      ctx.fillStyle = `${color}22`; ctx.beginPath(); ctx.arc(a.x, a.y, r + 4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = color; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(a.x - r * .6, a.y); ctx.lineTo(a.x + r * .6, a.y); ctx.moveTo(a.x, a.y - r * .6); ctx.lineTo(a.x, a.y + r * .6); ctx.stroke()
    }
    if (active) { ctx.strokeStyle = '#194b94'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, 7, 0, Math.PI * 2); ctx.stroke() }
    if ((!labels || !o.label.visible || camera.scale < 1.6 && wells.length > 100 && !forceLabels) && !active && !hovered && !(emphasis && labels)) continue
    const key = `${Math.floor(a.x / 80)}:${Math.floor(a.y / 18)}`
    if (occupied.has(key) && !active && !hovered && !emphasis) continue
    occupied.add(key); ctx.fillStyle = hovered ? '#194b94' : wellSymbol(o.attributes.type).color
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; const name = o.name
    ctx.strokeText(name, a.x + o.label.dx, a.y + o.label.dy); ctx.fillText(name, a.x + o.label.dx, a.y + o.label.dy)
    if (values && camera.scale >= 2) { ctx.fillStyle = '#53647c'; ctx.fillText(o.attributes.value.toFixed(2), a.x + o.label.dx, a.y + o.label.dy + 13) }
  }
}

import { objectPath, ticks, type Camera } from '../../entities/geology-map/geometry'
import { layerVisible, orderedLayers, type MapProject } from '../../entities/geology-map/model'

const papers = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] } as const
const escape = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)
export function planSvg(project: MapProject, camera: Camera, grid = true, raster?: string): string {
  const sheet = papers[project.print.paper], w = project.print.landscape ? sheet[1] : sheet[0], h = project.print.landscape ? sheet[0] : sheet[1], k = 1000 / project.print.scale
  const frame = { left: 15, top: 22, right: w - 12, bottom: h - 22 }, cx = (frame.left + frame.right) / 2, cy = (frame.top + frame.bottom) / 2
  const to = (p: { x: number; y: number }) => ({ x: cx + (p.y - camera.y) * k, y: cy - (p.x - camera.x) * k })
  const text = (x: number, y: number, value: string, size = 2.7, color = '#536671') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${escape(value)}</text>`
  const items: string[] = [], axisLabels: string[] = []
  if (raster && project.underlay?.visible) { const u = project.underlay, p = to(u); items.push(`<image href="${escape(raster)}" x="${p.x}" y="${p.y}" width="${u.width * k}" height="${u.height * k}" opacity="${u.opacity}" transform="rotate(${u.angle} ${p.x} ${p.y})" preserveAspectRatio="none"/>`) }
  if (grid) {
    for (const x of ticks(camera.x - (frame.bottom - cy) / k, camera.x + (cy - frame.top) / k, 35 / k)) { const p = to({ x, y: camera.y }); items.push(`<path d="M${frame.left},${p.y}H${frame.right}" stroke="#dbe3e8" stroke-width=".15"/>`); axisLabels.push(text(1, p.y, x.toFixed(0))) }
    for (const y of ticks(camera.y - (cx - frame.left) / k, camera.y + (frame.right - cx) / k, 35 / k)) { const p = to({ x: camera.x, y }); items.push(`<path d="M${p.x},${frame.top}V${frame.bottom}" stroke="#dbe3e8" stroke-width=".15"/>`); axisLabels.push(text(p.x - 4, 20, y.toFixed(0))) }
  }
  for (const layer of orderedLayers(project)) for (const o of project.objects.filter(o => o.layerId === layer.id && layerVisible(project, layer.id))) {
    if (o.kind === 'well') {
      const a = to(o.parts[0]!.nodes[0]!), b = to(o.parts[0]!.nodes[1]!)
      items.push(`<path d="M${a.x},${a.y}L${b.x},${b.y}m-1,0h2m-1,-1v2" stroke="${o.style.stroke}" stroke-width=".18" fill="none"/><circle cx="${a.x}" cy="${a.y}" r=".65" stroke="${o.style.stroke}" stroke-width=".18" fill="white"/>`)
      if (o.label.visible) items.push(text(a.x + o.label.dx * .2, a.y + o.label.dy * .2, o.name, 2.2, '#775c82'))
    } else {
      items.push(`<path d="${objectPath(o, to)}" fill="${o.closed ? o.style.fill : 'none'}" fill-opacity="${o.style.opacity}" fill-rule="evenodd" stroke="${o.style.stroke}" stroke-width="${o.style.paperWidth}"${o.style.dash !== 'solid' ? ` stroke-dasharray="${o.style.dash === 'dash' ? '2 1' : '.3 .8'}"` : ''}/>`)
    }
  }
  const legendLayers = orderedLayers(project).filter(l => layerVisible(project, l.id) && project.objects.some(o => o.layerId === l.id)).slice(0, 12)
  const legend = legendLayers.length ? `<g><rect x="${frame.right - 51}" y="${frame.top + 2}" width="49" height="${legendLayers.length * 4 + 9}" fill="white" fill-opacity=".92" stroke="#dbe3e8" stroke-width=".2"/>${text(frame.right - 48, frame.top + 7, 'Слои плана', 2.8)}${legendLayers.map((l, i) => { const o = project.objects.find(o => o.layerId === l.id)!; const y = frame.top + 12 + i * 4; return `<path d="M${frame.right - 48},${y - .8}h5" stroke="${o.style.stroke}" stroke-width=".5"/>${text(frame.right - 41, y, l.name.slice(0, 29), 2.3)}` }).join('')}</g>` : ''
  const ruler = 50, meters = ruler / k
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>${escape(project.title)}</title><defs><clipPath id="frame"><rect x="${frame.left}" y="${frame.top}" width="${frame.right - frame.left}" height="${frame.bottom - frame.top}"/></clipPath></defs><rect width="${w}" height="${h}" fill="white"/><g font-family="Arial,sans-serif">${text(15, 10, project.title, 4, '#10212c')}${text(15, 16, `${project.deposit} · залежь ${project.lens} · ${project.date} · ${project.author}`)}${axisLabels.join('')}<g clip-path="url(#frame)">${items.join('')}</g>${legend}<rect x="${frame.left}" y="${frame.top}" width="${frame.right - frame.left}" height="${frame.bottom - frame.top}" fill="none" stroke="#536671" stroke-width=".25"/>${text(15, h - 14, `Масштаб 1:${project.print.scale} · X — север, Y — восток · метры`)}<path d="M15,${h - 8}h${ruler}m-${ruler},-1v2m${ruler},-2v2" stroke="#10212c" stroke-width=".4"/>${text(15 + ruler + 3, h - 7, `${meters.toFixed(0)} м · контроль 50 мм`)}${text(w - 65, h - 8, `${project.id} · ${project.print.paper}`)}</g></svg>`
}
export function downloadFile(name: string, contents: Blob | string, type = 'application/json') {
  const url = URL.createObjectURL(contents instanceof Blob ? contents : new Blob([contents], { type })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500)
}
export async function downloadPng(svg: string, name: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob)
  try { const image = new Image(); image.src = url; await image.decode(); const canvas = document.createElement('canvas'), ratio = Math.min(2, 4096 / Math.max(image.width, image.height)); canvas.width = image.width * ratio; canvas.height = image.height * ratio; const context = canvas.getContext('2d'); if (!context) throw new Error('PNG недоступен.'); context.drawImage(image, 0, 0, canvas.width, canvas.height); const output = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Не удалось создать PNG.')), 'image/png')); downloadFile(name, output) } finally { URL.revokeObjectURL(url) }
}
export function printPlan(svg: string) {
  const frame = document.createElement('iframe'); frame.title = 'Печать плана'; frame.style.cssText = 'position:fixed;left:-10000px;width:1px;height:1px'; document.body.append(frame)
  const doc = frame.contentDocument; if (!doc) { frame.remove(); throw new Error('Печать недоступна.') }
  frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print() }
  doc.open(); doc.write(`<!doctype html><html lang="ru"><head><title>План месторождения</title><style>@page{margin:0;size:${svg.match(/width="([\d.]+mm)"/)?.[1]} ${svg.match(/height="([\d.]+mm)"/)?.[1]}}body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`); doc.close()
  setTimeout(() => frame.remove(), 120000)
}

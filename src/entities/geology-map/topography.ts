import { screenToWorld, worldToScreen, plotMargin, type Camera, type Size } from './geometry'
import type { XY } from './model'

const radius = 6378137, circumference = 2 * Math.PI * radius
/** Approximate local metre grid around Budenovskoye, not an official survey transformation. */
export const fieldGeoreference = { x: 57500, y: 95200, latitude: 44.75, longitude: 67.7 }
export type MapGeoreference = typeof fieldGeoreference
export function localToMercator(p: XY, reference = fieldGeoreference) {
  const lat = reference.latitude * Math.PI / 180, cos = Math.cos(lat)
  return { x: radius * reference.longitude * Math.PI / 180 + (p.y - reference.y) / cos, y: radius * Math.log(Math.tan(Math.PI / 4 + lat / 2)) + (p.x - reference.x) / cos }
}
export function mercatorToLocal(p: XY, reference = fieldGeoreference): XY {
  const anchor = localToMercator(reference, reference), cos = Math.cos(reference.latitude * Math.PI / 180)
  return { x: reference.x + (p.y - anchor.y) * cos, y: reference.y + (p.x - anchor.x) * cos }
}
export function localToGeographic(p: XY, reference = fieldGeoreference) {
  const mercator = localToMercator(p, reference)
  return { latitude: (2 * Math.atan(Math.exp(mercator.y / radius)) - Math.PI / 2) * 180 / Math.PI, longitude: mercator.x / radius * 180 / Math.PI }
}
export function visibleTopoTiles(camera: Camera, size: Size, reference = fieldGeoreference, padding = plotMargin) {
  const cos = Math.cos(reference.latitude * Math.PI / 180), zoom = Math.max(1, Math.min(17, Math.floor(Math.log2(circumference * camera.scale * cos / 256))))
  const n = 2 ** zoom, span = circumference / n
  const nw = localToMercator(screenToWorld({ x: padding.left, y: padding.top }, camera, size), reference), se = localToMercator(screenToWorld({ x: size.width - padding.right, y: size.height - padding.bottom }, camera, size), reference)
  const minX = Math.max(0, Math.floor((nw.x + circumference / 2) / span)), maxX = Math.min(n - 1, Math.floor((se.x + circumference / 2) / span))
  const minY = Math.max(0, Math.floor((circumference / 2 - nw.y) / span)), maxY = Math.min(n - 1, Math.floor((circumference / 2 - se.y) / span))
  const tiles: { id: string; url: string; x: number; y: number; side: number }[] = []
  for (let tx = minX; tx <= maxX; tx++) for (let ty = minY; ty <= maxY; ty++) {
    const point = worldToScreen(mercatorToLocal({ x: -circumference / 2 + tx * span, y: circumference / 2 - ty * span }, reference), camera, size)
    const id = `${zoom}/${tx}/${ty}`
    tiles.push({ id, url: `https://tile.opentopomap.org/${id}.png`, x: point.x, y: point.y, side: span * cos * camera.scale })
  }
  return tiles
}

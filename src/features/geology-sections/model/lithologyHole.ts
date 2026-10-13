import type { GeologySection, SectionGraphic } from '../../../entities/geology-section/model/types'
import { resolveGraphicPoints } from '../../../entities/geology-section/lib/boundaries'
import { graphicIssues, pointInside } from '../../../entities/geology-section/lib/geometry'

/** Editable starting triangle, validated against the actual parent and existing exclusions. */
export function lithologyHole(section: GeologySection, parent: SectionGraphic, id: string): SectionGraphic | null {
  if (parent.type !== 'lithology' || !parent.closed || parent.parentId) return null
  const ring = resolveGraphicPoints(parent, section)
  if (ring.length < 3) return null
  const minX = Math.min(...ring.map(p => p.x)), maxX = Math.max(...ring.map(p => p.x))
  const minZ = Math.min(...ring.map(p => p.z)), maxZ = Math.max(...ring.map(p => p.z))
  const centers = [{ x: ring.reduce((s, p) => s + p.x, 0) / ring.length, z: ring.reduce((s, p) => s + p.z, 0) / ring.length }]
  for (let row = 1; row < 10; row++) for (let column = 1; column < 10; column++) centers.push({ x: minX + (maxX - minX) * column / 10, z: minZ + (maxZ - minZ) * row / 10 })
  const siblings = section.graphics.filter(g => g.parentId === parent.id).map(g => resolveGraphicPoints(g, section))
  for (const center of centers) {
    if (!pointInside(center, ring) || siblings.some(s => pointInside(center, s))) continue
    for (let attempt = 0; attempt < 8; attempt++) {
      const size = .15 / 2 ** attempt, dx = (maxX - minX) * size, dz = (maxZ - minZ) * size
      const hole: SectionGraphic = { id, type: 'lithology', name: `Исключение ${siblings.length + 1}`, parentId: parent.id, closed: true, reversed: false, smooth: false,
        points: [{ x: center.x - dx, z: center.z + dz }, { x: center.x + dx, z: center.z + dz }, { x: center.x, z: center.z - dz }] }
      if (!graphicIssues(hole, { ...section, graphics: [...section.graphics, hole] }).length) return hole
    }
  }
  return null
}

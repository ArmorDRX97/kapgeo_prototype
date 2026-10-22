import type { SectionWellSource, XY } from './types'
import { profileLength, projectToProfile } from '../lib/profile'

export const previousReferenceTrace: XY[] = [{ x: 0, y: 0 }, { x: 160, y: 3 }, { x: 350, y: -1 }]
const length = profileLength(previousReferenceTrace)
const legs = [{ length: 90, angle: 25 }, { length: 150, angle: -30 }, { length: length - 240, angle: 35 }]
export const referenceTrace: XY[] = [{ x: 0, y: 0 }]
for (const leg of legs) {
  const a = referenceTrace.at(-1)!, angle = leg.angle * Math.PI / 180
  referenceTrace.push({ x: a.x + leg.length * Math.cos(angle), y: a.y + leg.length * Math.sin(angle) })
}

/** Bend the plan while retaining each sample's distance along the section and lateral offset. */
function bendPoint(p: XY): XY {
  const projection = projectToProfile(p, previousReferenceTrace), oldA = previousReferenceTrace[projection.segment]!, oldB = previousReferenceTrace[projection.segment + 1]!
  const oldLength = Math.hypot(oldB.x - oldA.x, oldB.y - oldA.y), ux = (oldB.x - oldA.x) / oldLength, uy = (oldB.y - oldA.y) / oldLength
  const dx = p.x - projection.x, dy = p.y - projection.y, along = dx * ux + dy * uy, across = -dx * uy + dy * ux
  let start = 0
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i]!
    if (projection.station <= start + leg.length || i === legs.length - 1) {
      const a = referenceTrace[i]!, angle = leg.angle * Math.PI / 180, distance = projection.station - start + along
      return { x: a.x + distance * Math.cos(angle) - across * Math.sin(angle), y: a.y + distance * Math.sin(angle) + across * Math.cos(angle) }
    }
    start += leg.length
  }
  return p
}
export function bendReferenceWell(well: SectionWellSource): SectionWellSource {
  return { ...well, collar: { ...well.collar, ...bendPoint(well.collar) }, trajectory: well.trajectory.map(p => ({ ...p, ...bendPoint(p) })) }
}

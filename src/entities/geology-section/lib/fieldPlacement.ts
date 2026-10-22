import type { XY } from '../model/types'

// Rigid visual placement in the field grid; inverse preserves metric distances.
const east = .63, north = Math.sqrt(1 - east * east)
export const toFieldPoint = (p: XY): XY => ({ x: 58900 - north * p.x + east * p.y, y: 93600 + east * p.x + north * p.y })
export const fromFieldPoint = (p: XY): XY => ({ x: -north * (p.x - 58900) + east * (p.y - 93600), y: east * (p.x - 58900) + north * (p.y - 93600) })

import type { GeologySection } from '../model/types'

export const defaultSegmentRadiusM = 20
export function segmentRadius(section: GeologySection, id: string) {
  return section.segmentRadiiM?.[id] ?? section.profileRadiusM ?? defaultSegmentRadiusM
}
export function withSegmentRadius(section: GeologySection, id: string, radius: number): GeologySection {
  if (!Number.isFinite(radius) || radius < 0 || radius > 100000) return section
  return { ...section, segmentRadiiM: { ...section.segmentRadiiM, [id]: radius } }
}

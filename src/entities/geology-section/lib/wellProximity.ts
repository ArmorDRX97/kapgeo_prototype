import type { SectionWellSource, XY } from '../model/types'
import { projectToProfile } from './profile'

/** Proximity is measured from the wellhead to the profile line in map coordinates. */
export function distanceFromWellToProfile(well: Pick<SectionWellSource, 'collar'>, profile: XY[]): number {
  return projectToProfile(well.collar, profile).distance
}

export function wellsWithinProfileRadius<T extends Pick<SectionWellSource, 'id' | 'collar'>>(
  wells: T[], profile: XY[], radiusM: number,
): Array<{ well: T; distanceM: number }> {
  if (!Number.isFinite(radiusM) || radiusM < 0) return []
  return wells
    .map(well => ({ well, distanceM: distanceFromWellToProfile(well, profile) }))
    .filter(candidate => candidate.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM || a.well.id.localeCompare(b.well.id))
}

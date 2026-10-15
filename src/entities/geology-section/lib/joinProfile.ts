import type { GeologySection, XY } from '../model/types'
import { distance, profileIssues } from './profile'
import { profileChangeIssues, profileWithBoundaries } from './profileChange'

export function joinProfile(section: GeologySection, segment: XY[], side: 'start' | 'end', reverse = false) {
  const errors = profileIssues(segment)
  if (segment.length !== 2 || errors.length) return { profile: section.profile, section, gap: 0, issues: errors.length ? errors : ['Задайте две точки независимого сегмента.'] }
  const attach = side === 'end' ? section.profile.at(-1)! : section.profile[0]!
  const nearFirst = distance(attach, segment[0]!) <= distance(attach, segment[1]!)
  const oriented = nearFirst !== reverse ? segment : [...segment].reverse()
  const gap = distance(attach, oriented[0]!)
  const addition = gap < .001 ? oriented.slice(1) : oriented
  const profile = side === 'end' ? [...section.profile, ...addition] : [...addition].reverse().concat(section.profile)
  const issues = profileChangeIssues(section, profile)
  // Joining a profile must yield an unambiguous, non-self-crossing directed trace.
  const cross = (a: XY, b: XY, c: XY) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const on = (a: XY, b: XY, p: XY) => Math.abs(cross(a, b, p)) < 1e-7 && p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7 && p.y >= Math.min(a.y, b.y) - 1e-7 && p.y <= Math.max(a.y, b.y) + 1e-7
  for (let i = 0; i < profile.length - 1; i++) for (let j = i + 2; j < profile.length - 1; j++) {
    const a = profile[i]!, b = profile[i + 1]!, c = profile[j]!, d = profile[j + 1]!
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0 || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)) issues.push('Соединённый профиль пересекает сам себя. Измените направление или точки сегмента.')
  }
  for (let i = 1; i < profile.length - 1; i++) if (Math.abs(cross(profile[i - 1]!, profile[i]!, profile[i + 1]!)) < 1e-7) {
    const a = profile[i - 1]!, b = profile[i]!, c = profile[i + 1]!
    if ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) < 0) issues.push('Сегменты идут обратно по той же линии. Измените направление.')
  }
  return { profile, section:profileWithBoundaries(section,profile), gap, issues: [...new Set(issues)] }
}

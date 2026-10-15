import type { GeologySection, XY } from '../model/types'
import { profileIssues, profileLength } from './profile'
import { correlationIssues } from './correlation'
import { graphicIssues } from './geometry'

/** Boundary-attached nodes follow the frame; free/manual coordinates retain their values. */
export function profileWithBoundaries(section: GeologySection, profile: XY[]): GeologySection {
  const length=profileLength(profile)
  return {...section,profile,contourEdits:Object.fromEntries(Object.entries(section.contourEdits??{}).map(([layer,edits])=>[layer,edits.map(e=>e.boundary?{...e,x:e.side==='left'?0:length}:e)]))}
}

/** Report dependent geometry before replacing a trace; never rebase manual work implicitly. */
export function profileChangeIssues(section: GeologySection, profile: XY[]): string[] {
  const invalid = profileIssues(profile)
  if (invalid.length) return invalid
  const next = profileWithBoundaries(section, profile), length = profileLength(profile), issues: string[] = []
  for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) issues.push(...correlationIssues(next, layer))
  for (const graphic of next.graphics) {
    const errors = graphicIssues(graphic, next)
    if (errors.length) issues.push(`${graphic.name}: ${errors.join(' ')}`)
  }
  for (const drawing of next.drawings) if (drawing.right > length + 1e-6) issues.push(`${drawing.name}: правая граница чертежа ${drawing.right.toFixed(2)} м превышает новую длину ${length.toFixed(2)} м.`)
  return [...new Set(issues)]
}

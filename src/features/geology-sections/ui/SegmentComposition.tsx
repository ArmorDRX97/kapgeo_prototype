import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'

export function SegmentComposition({ section, selectedIndex = 0 }: { section: GeologySection; selectedIndex?: number }) {
  const segments = sectionSegments(section)
  const segment = segments[Math.min(selectedIndex, Math.max(0, segments.length - 1))]
  if (!segment) return null
  const assignedIds = new Set(segment.wellIds)
  const names = sectionSources(section).filter(well => assignedIds.has(well.id)).map(well => well.name)
  return <section className="section-segment-composition" aria-label={`Скважины сегмента ${segment.index + 1}`}><strong>Скважины сегмента {segment.index + 1}</strong>{names.length ? <ul>{names.map(name => <li key={name}>{name}</li>)}</ul> : <p className="section-muted">Назначенных скважин нет</p>}</section>
}

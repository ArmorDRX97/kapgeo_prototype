import type { GeologicalInterval } from '../../../entities/well/model/types'
import type { GeologyTrackKind, WellGeologyWorkspace } from '../../../entities/well-geology/model/types'

export type BgdLithologyKind = Extract<GeologyTrackKind, 'core' | 'log' | 'composite'>

export const bgdLithologyKinds: Array<{ id: BgdLithologyKind; label: string; description: string }> = [
  { id: 'core', label: 'По керну', description: 'Полевое описание кернового материала' },
  { id: 'log', label: 'По каротажу', description: 'Интервалы, интерпретированные по ГИС' },
  { id: 'composite', label: 'Сводная', description: 'Итоговая согласованная литологическая колонка' },
]

export function findFirstLithologyGap(intervals: GeologicalInterval[], wellDepth: number) {
  const sorted = [...intervals].sort((first, second) => first.from - second.from)
  let cursor = 0
  for (const interval of sorted) {
    if (interval.from > cursor) return { from: cursor, to: interval.from }
    cursor = Math.max(cursor, interval.to)
  }
  return cursor < wellDepth ? { from: cursor, to: Math.min(wellDepth, cursor + 40) } : null
}

export function prepareBgdLithologySave(current: WellGeologyWorkspace, draft: WellGeologyWorkspace) {
  return {
    ...structuredClone(draft),
    tracks: draft.tracks.map((track) => {
      const baseline = current.tracks.find((item) => item.id === track.id)
      const changed = JSON.stringify(baseline?.intervals ?? []) !== JSON.stringify(track.intervals)
      return changed ? { ...track, version: (baseline?.version ?? track.version) + 1, status: 'draft' as const } : track
    }),
  }
}

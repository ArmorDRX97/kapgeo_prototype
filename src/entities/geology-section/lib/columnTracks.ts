import type { ColumnSettings, ColumnTrack, SectionWellSource } from '../model/types'

/** Legacy settings are interpreted lazily; an explicit empty list means no tracks. */
export function columnTracks(column: ColumnSettings, well: SectionWellSource): ColumnTrack[] {
  if (column.tracks) return column.tracks
  const lithology: ColumnTrack[] = [{ id: 'lithology', type: 'lithology', width: column.width }]
  const curves: ColumnTrack[] = well.curves.map(c => ({ id: `curve-${c.id}`, type: 'curve', curveId: c.id, width: 24 }))
  return [...(column.curvesFirst ? [...curves, ...lithology] : [...lithology, ...curves]), { id: 'intervals', type: 'intervals', width: 4 }]
}
export function visibleTracks(column: ColumnSettings, well: SectionWellSource) {
  return columnTracks(column, well).filter(t => t.type === 'lithology' ? column.lithology : t.type === 'intervals' ? column.intervals : column.curves && column.curveSettings?.[t.curveId ?? '']?.visible !== false && well.curves.some(c => c.id === t.curveId))
}
export function trackName(track: ColumnTrack, well: SectionWellSource) { return track.type === 'lithology' ? 'Литология' : track.type === 'intervals' ? 'Интервалы' : well.curves.find(c => c.id === track.curveId)?.name ?? 'Неизвестная кривая' }
export function trackIssues(column: ColumnSettings, well: SectionWellSource): string[] {
  const tracks = columnTracks(column, well), issues: string[] = []
  if (tracks.length > 12 || new Set(tracks.map(t => t.id)).size !== tracks.length) issues.push('Не более 12 треков с уникальными идентификаторами.')
  if (tracks.some(t => !Number.isFinite(t.width) || t.width < 2 || t.width > 80)) issues.push('Ширина трека должна быть от 2 до 80 экранных единиц.')
  if (tracks.some(t => t.type === 'curve' && !well.curves.some(c => c.id === t.curveId))) issues.push('Для трека не найден локальный источник кривой.')
  return issues
}

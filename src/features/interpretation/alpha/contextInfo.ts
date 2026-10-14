import { valueAtDepth, type TrackInteraction, type TrackSpec } from '@kapgeo/geo-viz/wellog'
import type { AlphaDocument, AlphaPage, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'

const number = (value: number | null | undefined) => value === null || value === undefined ? 'нет данных' : Number(value.toFixed(4)).toString()
export function trackContext(wellCode: string, tracks: TrackSpec[], records: MeasurementRecord[], event: TrackInteraction) {
  const track = tracks.find(t => t.id === event.trackId)
  if (!track) return `${wellCode} · колонка недоступна`
  const lines = [`${wellCode} · ${track.title}`, `Глубина: ${event.depth.toFixed(2)} м`]
  for (const curve of track.curves) {
    lines.push(`${curve.name}: ${number(valueAtDepth(curve.data, event.depth))} ${curve.unit}`)
    const record = records.find(r => r.id === curve.id)
    if (record) lines.push(`${record.date} · ${record.instrument} · ${record.operator} · ревизия ${record.revision}`)
  }
  for (const row of track.intervals?.filter(r => event.depth >= r.from && event.depth <= r.to) ?? []) lines.push(`${row.label} · ${row.from.toFixed(3)}–${row.to.toFixed(3)} м`)
  for (const bar of track.bars?.filter(r => event.depth >= r.from && event.depth <= r.to) ?? []) lines.push(`${bar.from.toFixed(2)}–${bar.to.toFixed(2)} м · ${bar.label}`)
  for (const guide of track.guides ?? []) if (guide.value !== undefined || guide.depth !== undefined && Math.abs(guide.depth - event.depth) <= 0.5) lines.push(`${guide.label}: ${guide.depth !== undefined ? `${guide.depth} м` : `${number(guide.value)} ${track.curves[0]?.unit ?? ''}`}`)
  for (const note of track.annotations?.filter(n => Math.abs(n.depth - event.depth) <= 0.5) ?? []) lines.push(`Подпись ${note.depth} м: ${note.text}`)
  if (lines.length === 2) lines.push('В этой точке объектов нет.')
  return lines.join('\n')
}
export function resultContext(wellCode: string, doc: AlphaDocument, page: AlphaPage, id: string) {
  if (page === 'flow') { const row = doc.flow.rows.find(r => r.id === id); return row ? `${wellCode} · участок расхода\n${row.from}–${row.to} м\nQ: ${number(row.rate)} м³/час · доля ${number(row.percent)}%\n${doc.flow.note}` : null }
  if (page === 'controls') {
    const row = doc.controls.rows.find(r => r.id === id)
    return row ? `${wellCode} · пара контроля\nОсновное: ${row.from}–${row.to} м · контроль: ${row.controlFrom}–${row.controlTo} м\nm основное / контроль: ${number(row.mainThickness)} / ${number(row.controlThickness)} м\nmc основное / контроль: ${number(row.mainMetro)} / ${number(row.controlMetro)} м·%\nПлощадь основная / контрольная: ${number(row.mainArea)} / ${number(row.controlArea)}\nРасхождение: ${number(row.relative)}% · глубина ${number(row.depthError)} м · мощность ${number(row.thicknessError)} м\n${{pass:'В пределах заданных допусков',fail:'Есть превышение',unmatched:'Недостаточно данных / нет пары'}[row.status]}` : null
  }
  return null
}

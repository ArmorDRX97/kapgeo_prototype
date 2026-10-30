import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ColumnSettings, ColumnTrack, GeologySection, SectionWellSource } from '../../../entities/geology-section/model/types'
import { columnTracks, trackIssues, trackName } from '../../../entities/geology-section/lib/columnTracks'
import { Button } from '../../../shared/ui/Button'

export function TrackSettingsEditor({ section, columnId, column, source, disabled, onChange }: { section: GeologySection; columnId: string; column: ColumnSettings; source: SectionWellSource; disabled: boolean; onChange: (s: GeologySection) => void }) {
  const [choice, setChoice] = useState('lithology'), [error, setError] = useState('')
  const tracks = columnTracks(column, source)
  const change = (next: ColumnTrack[]) => {
    const settings = { ...column, tracks: next }, issues = trackIssues(settings, source)
    if (issues.length) { setError(issues.join(' ')); return }
    setError(''); onChange({ ...section, columnSettings: { ...section.columnSettings, [columnId]: settings } })
  }
  const move = (index: number, direction: number) => { const next = [...tracks]; [next[index], next[index + direction]] = [next[index + direction]!, next[index]!]; change(next) }
  return <fieldset><legend>Состав и порядок треков</legend><p className="section-muted">Порядок слева направо. Каждый каротаж занимает отдельный трек; контакты исходных интервалов не меняются. Область настройки: {columnId === 'all' ? 'все скважины без индивидуальных настроек' : source.name}.</p>
    <div className="section-actions"><label>Новый трек<select disabled={disabled} value={choice} onChange={e => setChoice(e.target.value)}><option value="lithology">Литология</option><option value="intervals">Интервалы</option>{source.curves.map(c => <option key={c.id} value={`curve:${c.id}`}>{c.name} · {c.unit}</option>)}</select></label><Button variant="secondary" disabled={disabled || tracks.length >= 12} onClick={() => { let n = 1; while (tracks.some(t => t.id === `track-${n}`)) n++; change([...tracks, { id: `track-${n}`, type: choice.startsWith('curve:') ? 'curve' : choice as 'lithology' | 'intervals', curveId: choice.startsWith('curve:') ? choice.slice(6) : undefined, width: choice === 'lithology' ? column.width : choice === 'intervals' ? 4 : 24 }]) }}>Добавить трек</Button></div>
    {!tracks.length && <p role="status">Треков нет. Добавьте нужные колонки; геологические контуры остаются на разрезе.</p>}
    <ol className="section-track-list">{tracks.map((t, i) => <li key={t.id}><span>{trackName(t, source)}</span><label>Ширина<input type="number" aria-label={`Трек ${i + 1}: ширина`} min={2} max={80} value={t.width} disabled={disabled} onChange={e => change(tracks.map((q, j) => j === i ? { ...q, width: e.target.valueAsNumber } : q))} /></label><Button variant="quiet" aria-label={`Трек ${i + 1}: влево`} disabled={disabled || !i} onClick={() => move(i, -1)}>←</Button><Button variant="quiet" aria-label={`Трек ${i + 1}: вправо`} disabled={disabled || i === tracks.length - 1} onClick={() => move(i, 1)}>→</Button><Button className="action-delete action-delete--icon" size="sm" variant="quiet" aria-label={`Удалить трек ${i + 1}`} disabled={disabled} onClick={() => change(tracks.filter((_, j) => j !== i))}><Trash2 size={15} /></Button></li>)}</ol>
    <Button variant="quiet" disabled={disabled || !column.tracks} onClick={() => { const next = { ...column }; delete next.tracks; onChange({ ...section, columnSettings: { ...section.columnSettings, [columnId]: next } }); setError('') }}>Стандартный состав треков</Button>{error && <p role="alert" className="section-error">{error}</p>}
  </fieldset>
}

import { useState } from 'react'
import type { ColumnSettings, GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { defaultColumns } from '../model/presentation'
import { TrackSettingsEditor } from './TrackSettingsEditor'
import { Button } from '../../../shared/ui/Button'

type CurveSettings = NonNullable<ColumnSettings['curveSettings']>[string]
export function CurveSettingsEditor({ section, columnId, disabled, onChange }: { section: GeologySection; columnId: string; disabled: boolean; onChange: (section: GeologySection) => void }) {
  const [error, setError] = useState('')
  const column = section.columnSettings?.[columnId] ?? section.columnSettings?.all ?? defaultColumns
  const source = sectionSources(section).find(w => w.id === columnId) ?? sectionSources(section)[0]!
  const change = (id: string, settings: CurveSettings) => {
    if (![settings.min, settings.max, settings.from, settings.to].every(Number.isFinite) || settings.min >= settings.max || settings.from < 0 || settings.from >= settings.to || settings.to > source.depth) { setError('Минимум шкалы должен быть меньше максимума; диапазон MD — внутри ствола.'); return }
    setError(''); onChange({ ...section, columnSettings: { ...section.columnSettings, [columnId]: { ...column, curveSettings: { ...column.curveSettings, [id]: settings } } } })
  }
  return <div className="section-curve-settings"><TrackSettingsEditor section={section} columnId={columnId} column={column} source={source} disabled={disabled} onChange={onChange} /><p className="section-muted">Источник кривых: локальный набор разрезов. Контакты интервалов остаются на траектории скважины.</p>{source.curves.map(curve => {
    const settings = column.curveSettings?.[curve.id] ?? { visible: true, min: curve.id === 'rs' ? column.curveMin : curve.min, max: curve.id === 'rs' ? column.curveMax : curve.max, from: 0, to: source.depth }
    return <fieldset key={curve.id}><legend>{curve.name} · {curve.unit}</legend><label><input type="checkbox" checked={settings.visible} disabled={disabled} onChange={e => change(curve.id, { ...settings, visible: e.target.checked })} />Показать кривую</label><div className="section-form">{(['min', 'max', 'from', 'to'] as const).map((key, i) => <label key={key}>{['Минимум шкалы', 'Максимум шкалы', 'Начало MD, м', 'Конец MD, м'][i]}<input type="number" aria-label={`${curve.name}: ${['минимум', 'максимум', 'от MD', 'до MD'][i]}`} value={settings[key]} disabled={disabled} onChange={e => change(curve.id, { ...settings, [key]: e.target.valueAsNumber })} /></label>)}</div><Button variant="quiet" disabled={disabled} onClick={() => change(curve.id, { ...settings, min: curve.min, max: curve.max, from: 0, to: source.depth })}>Шкала и диапазон источника</Button></fieldset>
  })}{error && <p role="alert" className="section-error">{error}</p>}</div>
}

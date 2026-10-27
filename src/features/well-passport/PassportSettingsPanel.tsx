import { LegendEditor } from '../geology-data/LegendEditor'
import { ArrowDown, ArrowUp, Check, ChevronRight, Layers3 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { Tooltip } from '../../shared/ui/Tooltip'
import { defaultSettings, number, templates, trackDefinitions, type PassportSettings, type PassportWell, type TrackId } from './model'

function RangeEditor({ well, settings, onChange }: { well: PassportWell; settings: PassportSettings; onChange: (patch: Partial<PassportSettings>) => void }) {
  const [from, setFrom] = useState(String(settings.from)), [to, setTo] = useState(String(settings.to))
  const changed = Number(from) !== settings.from || Number(to) !== settings.to
  const valid = from.trim() !== '' && to.trim() !== '' && Number.isFinite(Number(from)) && Number.isFinite(Number(to)) && Number(from) >= 0 && Number(to) <= well.depth && Number(to) > Number(from)
  return <form className="passport-range" onSubmit={e => { e.preventDefault(); if (valid) onChange({ from: Number(from), to: Number(to) }) }}>
    <div className="passport-setting-heading"><h3>Интервал глубин</h3><span>м</span></div>
    <div className="passport-range-fields"><label><span>От</span><input type="number" step="0.1" min="0" max={well.depth} aria-label="Паспорт: от, м" value={from} onChange={e => setFrom(e.target.value)} aria-invalid={!valid} /></label><span>—</span><label><span>До</span><input type="number" step="0.1" min="0" max={well.depth} aria-label="Паспорт: до, м" value={to} onChange={e => setTo(e.target.value)} aria-invalid={!valid} /></label></div>
    {!valid && <p className="passport-error" role="alert">Задайте интервал от 0 до {number(well.depth)} м. Конец должен быть глубже начала.</p>}
    {changed && <Button size="sm" type="submit" disabled={!valid} className="passport-range-apply">Применить интервал</Button>}
    <div className="passport-range-presets"><button type="button" onClick={() => { const d = defaultSettings(well); onChange({ from: d.from, to: d.to }) }}>Продуктивный горизонт</button><button type="button" onClick={() => onChange({ from: 0, to: well.depth })}>Весь ствол</button></div>
  </form>
}
export function PassportSettingsPanel({ well, settings: s, onChange, onTemplate }: { well: PassportWell; settings: PassportSettings; onChange: (patch: Partial<PassportSettings>) => void; onTemplate: () => void }) {
  const [tab, setTab] = useState<'content' | 'style'>('content')
  const toggleTrack = (id: TrackId) => onChange({ tracks: s.tracks.includes(id) ? s.tracks.filter(t => t !== id) : [...s.tracks, id] })
  const move = (id: TrackId, delta: number) => { const tracks = [...s.tracks], i = tracks.indexOf(id); [tracks[i], tracks[i + delta]] = [tracks[i + delta]!, tracks[i]!]; onChange({ tracks }) }
  const ordered = [...s.tracks, ...trackDefinitions.map(t => t.id).filter(id => !s.tracks.includes(id))]
  return <>
    <div className="passport-settings-tabs" role="tablist" aria-label="Настройки паспорта" onKeyDown={e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const next = tab === 'content' ? 'style' : 'content'; setTab(next); e.currentTarget.querySelector<HTMLButtonElement>(`[id="passport-tab-${next}"]`)?.focus() }}>
      <button id="passport-tab-content" type="button" role="tab" aria-selected={tab === 'content'} aria-controls="passport-panel-content" tabIndex={tab === 'content' ? 0 : -1} onClick={() => setTab('content')}>Состав</button>
      <button id="passport-tab-style" type="button" role="tab" aria-selected={tab === 'style'} aria-controls="passport-panel-style" tabIndex={tab === 'style' ? 0 : -1} onClick={() => setTab('style')}>Оформление</button>
    </div>
    <div className="passport-settings-scroll" role="tabpanel" id={`passport-panel-${tab}`} aria-labelledby={`passport-tab-${tab}`}>
      {tab === 'content' ? <>
        <div className="passport-settings-section"><div className="passport-setting-heading"><h3>Шаблон паспорта</h3></div><button className="passport-current-template" type="button" onClick={onTemplate}><Layers3 size={20} /><span><strong>{templates.find(t => t.id === s.template)!.name}</strong><small>Изменить состав по шаблону</small></span><ChevronRight size={16} /></button></div>
        <div className="passport-settings-section"><RangeEditor key={`${s.from}-${s.to}`} well={well} settings={s} onChange={onChange} /><div className="passport-setting-heading"><h3>Масштаб документа</h3></div><div className="passport-segmented" role="group" aria-label="Масштаб документа">{([200, 500, 1000] as const).map(scale => <button key={scale} type="button" aria-pressed={s.scale === scale} onClick={() => onChange({ scale })}>1:{scale}</button>)}</div></div>
        <div className="passport-settings-section passport-tracks-section"><div className="passport-setting-heading"><h3>Дорожки на листе</h3><span>{s.tracks.length} из {trackDefinitions.length}</span></div><p className="passport-muted passport-track-hint">В порядке слева направо. Шкала глубин включена всегда.</p><div className="passport-track-list">{ordered.map(id => { const def = trackDefinitions.find(t => t.id === id)!, i = s.tracks.indexOf(id), enabled = i >= 0; return <div key={id} className={`passport-track-option${enabled ? ' is-enabled' : ''}`}>
          <label><input type="checkbox" checked={enabled} disabled={enabled && s.tracks.length === 1} onChange={() => toggleTrack(id)} /><span className="passport-track-swatch" style={{ background: def.color }} /><span><strong>{def.name}</strong><small>{def.detail}</small></span></label>
          {enabled && <div className="passport-track-order" data-tooltip-group>{[{ delta: -1, icon: ArrowUp, label: `Сдвинуть влево: ${def.name}`, disabled: i === 0 }, { delta: 1, icon: ArrowDown, label: `Сдвинуть вправо: ${def.name}`, disabled: i === s.tracks.length - 1 }].map(({ delta, icon: Icon, label, disabled }) => <Tooltip key={delta} content={label}><button type="button" aria-label={label} disabled={disabled} onClick={() => move(id, delta)}><Icon size={13} /></button></Tooltip>)}</div>}
        </div> })}</div></div>
        {s.tracks.includes('lithology') && <div className="passport-settings-section"><label className="passport-field"><span>Источник литологии</span><select value={s.lithology} onChange={e => onChange({ lithology: e.target.value as PassportSettings['lithology'] })}><option value="summary">Сводная</option><option value="core">По керну</option><option value="logging">По каротажу</option></select></label></div>}
        {s.tracks.includes('ore') && <div className="passport-settings-section"><div className="passport-setting-heading"><h3>Рудные интервалы</h3></div><div className="passport-segmented" role="group" aria-label="Источник рудных интервалов">{(['gamma', 'knd', 'samples'] as const).map(source => <button type="button" key={source} aria-pressed={s.oreSource === source} onClick={() => onChange({ oreSource: source })}>{{ gamma: 'По ГК', knd: 'По КНД', samples: 'По пробам' }[source]}</button>)}</div></div>}
      </> : <>
        <div className="passport-settings-section"><LegendEditor onChange={() => onChange({ legend: true })} /><div className="passport-setting-heading"><h3>Лист и отображение</h3><span>A3</span></div><div className="passport-paper-spec"><FilePaper /><span>420 × 297 мм<small>Альбомная ориентация</small></span></div><div className="passport-segmented" role="group" aria-label="Цвет паспорта"><button type="button" aria-pressed={s.color} onClick={() => onChange({ color: true })}>Цветной</button><button type="button" aria-pressed={!s.color} onClick={() => onChange({ color: false })}>Чёрно-белый</button></div><label className="passport-check"><input type="checkbox" checked={s.grid} onChange={e => onChange({ grid: e.target.checked })} />Сетка глубин и значений</label><label className="passport-check"><input type="checkbox" checked={s.legend} onChange={e => onChange({ legend: e.target.checked })} />Условные обозначения</label></div>
        <div className="passport-settings-section"><label className="passport-field"><span>Шкала ГК, мкР/ч</span><select value={s.gammaMax} onChange={e => onChange({ gammaMax: Number(e.target.value) })}>{[50, 100, 200].map(v => <option key={v} value={v}>0–{v}</option>)}</select></label><p className="passport-muted">Меняет горизонтальную шкалу кривой. Масштаб глубин задаётся во вкладке «Состав».</p></div>
        <div className="passport-settings-section"><div className="passport-setting-heading"><h3>Реквизиты документа</h3></div><label className="passport-field"><span>Составил</span><input value={s.author} maxLength={60} onChange={e => onChange({ author: e.target.value })} /></label><label className="passport-field"><span>Дата составления</span><input type="date" value={s.date} onChange={e => onChange({ date: e.target.value })} /></label><label className="passport-field"><span>Примечание</span><textarea aria-label="Примечание" value={s.note} maxLength={160} rows={3} placeholder="Дополнительные сведения на листе" onChange={e => onChange({ note: e.target.value })} /></label></div>
      </>}
    </div>
    <div className="passport-settings-footer"><Check size={14} /><span>Оформление сохраняется автоматически</span></div>
  </>
}
function FilePaper() { return <span className="passport-paper-symbol" aria-hidden="true"><i /><i /><i /></span> }

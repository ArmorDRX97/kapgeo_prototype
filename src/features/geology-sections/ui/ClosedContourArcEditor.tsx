import { useEffect, useState } from 'react'
import type { ContourArcEdit, GeologySection, SectionLayer } from '../../../entities/geology-section/model/types'
import { contourArcIssues, rawLayerPolygons } from '../../../entities/geology-section/lib/correlation'
import { openRing, ringKey, selectContourArc } from '../../../entities/geology-section/lib/contourArc'
import { Button } from '../../../shared/ui/Button'
import { SectionCanvas } from './SectionCanvas'

export function ClosedContourArcEditor({ section, layer, disabled, onChange, onPending }: { section: GeologySection; layer: SectionLayer; disabled: boolean; onChange: (s: GeologySection) => void; onPending: (pending: boolean) => void }) {
  const rings = rawLayerPolygons(section, layer).flatMap((p, polygon) => p.map((r, hole) => ({ points: openRing(r), key: ringKey(r), label: `Контур ${polygon + 1}${hole ? ` · исключение ${hole}` : ' · внешний'}` })))
  const [chosen, setChosen] = useState(''), [start, setStart] = useState(0), [end, setEnd] = useState(1), [route, setRoute] = useState<'short' | 'long'>('short'), [operation, setOperation] = useState<'smooth' | 'straight'>('smooth')
  const [draft, setDraft] = useState<ContourArcEdit | null>(null), [error, setError] = useState('')
  useEffect(() => { onPending(!!draft); return () => onPending(false) }, [draft, onPending])
  const ring = rings.find(r => r.key === chosen) ?? rings[0]
  const candidate = draft ? { ...section, contourArcEdits: { ...section.contourArcEdits, [layer]: [...(section.contourArcEdits?.[layer] ?? []).filter(e => e.ringKey !== draft.ringKey), draft] } } : section
  const issues = draft ? contourArcIssues(candidate, layer) : []
  let selectedArc: ReturnType<typeof selectContourArc> | undefined
  if (ring) { try { selectedArc = selectContourArc(ring.points, start, end, route) } catch { /* invalid selection is explained on preview */ } }
  return <details onKeyDown={e => { if (e.key === 'Escape') { setDraft(null); setError('') } }}><summary>Дуга замкнутого контура</summary>
    {!ring ? <p role="status">Нет контуров для обработки. Включите скважины и постройте слой.</p> : <>
      <p className="section-muted">Выберите две вершины и короткий либо длинный путь по периметру. Концы дуги и исходные контакты сохраняются. Сглаживание проходит через вершины; спрямление убирает только свободные промежуточные точки. На каждом кольце хранится одна операция; изменение исходного контура сбрасывает её с сообщением.</p>
      <div className="section-form"><label>Замкнутый контур<select value={ring.key} disabled={!!draft} onChange={e => { setChosen(e.target.value); setStart(0); setEnd(1); setError('') }}>{rings.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select></label>
        {(['start', 'end'] as const).map(key => <label key={key}>{key === 'start' ? 'Начало дуги' : 'Конец дуги'}<select value={key === 'start' ? start : end} disabled={!!draft} onChange={e => { (key === 'start' ? setStart : setEnd)(Number(e.target.value)); setError('') }}>{ring.points.map((p, i) => <option key={i} value={i}>{i + 1}: X {p.x.toFixed(2)} · Z {p.z.toFixed(2)} м</option>)}</select></label>)}
        <label>Путь по контуру<select value={route} disabled={!!draft} onChange={e => setRoute(e.target.value as typeof route)}><option value="short">Короткая дуга</option><option value="long">Длинная дуга</option></select></label><label>Обработка дуги<select value={operation} disabled={!!draft} onChange={e => setOperation(e.target.value as typeof operation)}><option value="smooth">Сгладить</option><option value="straight">Спрямить</option></select></label>
      </div><p role="status">{selectedArc ? `${selectedArc.indices.length} вершин · длина дуги ${selectedArc.length.toFixed(2)} м` : 'Выберите две разные вершины.'}</p>
      <div className="section-actions"><Button variant="secondary" disabled={disabled || !!draft || !selectedArc} onClick={() => { setDraft({ ringKey: ring.key, start, end, route, operation }); setError('') }}>Предпросмотр дуги</Button><Button disabled={disabled || !draft || issues.length > 0} onClick={() => { onChange(candidate); setDraft(null); setError('') }}>Применить обработку дуги</Button><Button variant="quiet" disabled={!draft} onClick={() => { setDraft(null); setError('') }}>Отменить обработку дуги</Button><Button variant="quiet" disabled={disabled || !!draft || !section.contourArcEdits?.[layer]?.some(e => e.ringKey === ring.key)} onClick={() => onChange({ ...section, contourArcEdits: { ...section.contourArcEdits, [layer]: section.contourArcEdits?.[layer]?.filter(e => e.ringKey !== ring.key) ?? [] } })}>Восстановить исходный контур</Button></div>
      {(error || issues.length > 0) && <p role="alert" className="section-error">{error || issues.join(' ')}</p>}
      {draft && <SectionCanvas surfaceState="preview" section={candidate} layers={[layer]} draft={selectedArc?.points} />}
    </>}
  </details>
}

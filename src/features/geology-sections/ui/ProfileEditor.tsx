import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { fitBrokenProfile, fitProfile, pointAtDepth, profileIssues, profileLength, projectToProfile } from '../../../entities/geology-section/lib/profile'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import type { GeologySection, XY } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { profileChangeIssues } from '../../../entities/geology-section/lib/profileChange'
import { reconcileProfile, sectionSegments } from '../../../entities/geology-section/lib/segments'
import { SegmentComposition } from './SegmentComposition'

export function ProfileEditor({ section, disabled, onChange }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void }) {
  const [before, setBefore] = useState(20), [after, setAfter] = useState(20)
  const [groups, setGroups] = useState<string[][]>(()=>{const segments=sectionSegments(section);return segments.some(s=>s.wellIds.length)?segments.map(s=>s.wellIds):[section.wellIds]})
  const [preview, setPreview] = useState<XY[] | null>(null), [error, setError] = useState('')
  const points = section.profile
  const previewIssues = preview ? profileChangeIssues(section, preview) : []
  const applyPoints = (profile: XY[]) => onChange({ ...section, profile })
  const reorder = (index: number, shift: number) => { const next = [...points]; [next[index], next[index + shift]] = [next[index + shift]!, next[index]!]; applyPoints(next) }
  const calculate = () => {
    try {
      const ids=groups.flat();if(new Set(ids).size!==ids.length) throw new Error('Для расчёта назначьте каждую скважину только одному сегменту.')
      const bottoms = groups.map(ids => ids.filter(id => section.wellIds.includes(id)).map(id => sectionSources(section).find(w => w.id === id)!).filter(Boolean).map(w => pointAtDepth(w, w.depth)))
      setPreview(bottoms.length === 1 ? fitProfile(bottoms[0]!, before, after) : fitBrokenProfile(bottoms, before, after)); setError('')
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Не удалось рассчитать профиль.') }
  }
  return <section><h2>Направленный профиль</h2><p className="section-muted">Сегменты соединены последовательными вершинами. Длина: {Number.isFinite(profileLength(points)) ? profileLength(points).toFixed(2) : '—'} м.</p>
    {profileIssues(points).length > 0 && <p role="alert" className="section-error">{profileIssues(points).join(' ')}</p>}
    <div className="section-table-scroll"><table className="section-table" aria-label="Вершины профиля"><thead><tr><th>№</th><th>X, м</th><th>Y, м</th><th>Порядок</th><th>Действие</th></tr></thead><tbody>{points.map((p, index) => <tr key={index}><td>{index + 1}</td>{(['x', 'y'] as const).map(axis => <td key={axis}><input aria-label={`${axis.toUpperCase()} вершины ${index + 1}`} type="number" step="0.1" value={Number.isFinite(p[axis]) ? p[axis] : ''} disabled={disabled} onChange={e => applyPoints(points.map((point, i) => i === index ? { ...point, [axis]: e.target.valueAsNumber } : point))} /></td>)}<td><Button variant="quiet" size="sm" disabled={disabled || index === 0} aria-label={`Поднять вершину ${index + 1}`} onClick={() => reorder(index, -1)}><ArrowUp size={15} /></Button><Button variant="quiet" size="sm" disabled={disabled || index === points.length - 1} aria-label={`Опустить вершину ${index + 1}`} onClick={() => reorder(index, 1)}><ArrowDown size={15} /></Button></td><td><Button variant="quiet" size="sm" disabled={disabled || points.length <= 2} aria-label={`Удалить вершину ${index + 1}`} onClick={() => applyPoints(points.filter((_, i) => i !== index))}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div>
    <div className="section-actions"><Button variant="secondary" disabled={disabled} onClick={() => { const last = points.at(-1)!; applyPoints([...points, { x: last.x + 50, y: last.y }]) }}><Plus size={16} />Добавить вершину</Button><Button variant="secondary" disabled={disabled} onClick={() => applyPoints([...points].reverse())}>Развернуть профиль</Button><Button variant="secondary" disabled={disabled || profileIssues(points).length > 0} onClick={() => onChange({ ...section, wellIds: [...section.wellIds].sort((a, b) => {
      const wa = sectionSources(section).find(w => w.id === a)!, wb = sectionSources(section).find(w => w.id === b)!
      return projectToProfile(pointAtDepth(wa, wa.depth), points).station - projectToProfile(pointAtDepth(wb, wb.depth), points).station
    }) })}>Скважины по профилю</Button></div>
    <SegmentComposition section={section} disabled={disabled} onChange={onChange}/>
    <details className="section-setup__details"><summary>Расчёт по забоям скважин</summary><div><p className="section-muted">Ортогональная МНК. Для каждого сегмента выберите не менее двух разных скважин; порядок первой и последней задаёт направление.</p>
    <div className="section-form"><label>Поле до первой, м<input type="number" min="0" value={before} disabled={disabled} onChange={e => setBefore(e.target.valueAsNumber)} /></label><label>Поле после последней, м<input type="number" min="0" value={after} disabled={disabled} onChange={e => setAfter(e.target.valueAsNumber)} /></label></div>
    {groups.map((ids, index) => <fieldset className="section-checks" key={index} disabled={disabled}><legend>Сегмент {index + 1}</legend>{sectionSources(section).filter(w => section.wellIds.includes(w.id)).map(w => <label key={w.id}><input type="checkbox" checked={ids.includes(w.id)} onChange={e => setGroups(groups.map((g, i) => i !== index ? g : e.target.checked ? [...g, w.id] : g.filter(id => id !== w.id)))} />{w.name}</label>)}{groups.length > 1 && <Button variant="quiet" onClick={() => setGroups(groups.filter((_, i) => i !== index))}>Удалить сегмент расчёта</Button>}</fieldset>)}
    <div className="section-actions"><Button variant="secondary" disabled={disabled} onClick={() => setGroups([...groups, []])}>Добавить сегмент расчёта</Button><Button disabled={disabled} onClick={calculate}>Рассчитать профиль</Button></div>
    {error && <p role="alert" className="section-error">{error}</p>}</div></details>
    {preview && <WorkspaceDialog title="Предпросмотр профиля" size="compact" onClose={() => setPreview(null)} footer={<><Button variant="secondary" onClick={() => setPreview(null)}>Отмена</Button><Button disabled={disabled || previewIssues.length > 0} onClick={() => { const next=reconcileProfile(section,{...section,profile:preview}).section;onChange({...next,segmentWells:Object.fromEntries(sectionSegments(next).map((segment,i)=>[segment.id,groups[i]?.filter(id=>section.wellIds.includes(id))??[]]))});setPreview(null) }}>Применить профиль</Button></>}><p>Текущая трасса сохранится до применения. Состав скважин не изменяется.</p><ol>{preview.map((p, i) => <li key={i}>X {p.x.toFixed(2)} · Y {p.y.toFixed(2)} м</li>)}</ol>{previewIssues.length > 0 && <div role="alert" className="section-error"><p>Сначала скорректируйте зависимые объекты. Ручные координаты автоматически не переносятся.</p><ul>{previewIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}</WorkspaceDialog>}
  </section>
}

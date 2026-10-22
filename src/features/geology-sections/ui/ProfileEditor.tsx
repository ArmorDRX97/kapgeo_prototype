import { mapSegments } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { useEffect, useState } from 'react'
import { fitBrokenProfile, fitProfile, pointAtDepth, profileIssues, profileLength } from '../../../entities/geology-section/lib/profile'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import type { GeologySection, XY } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { profileChangeIssues } from '../../../entities/geology-section/lib/profileChange'
import { reconcileProfile, sectionSegments } from '../../../entities/geology-section/lib/segments'

export function ProfileEditor({ section, disabled, onChange, onPending, coordinateTransform = p => p }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void;onPending?:(pending:boolean)=>void; coordinateTransform?: (p: XY) => XY }) {
  const [before, setBefore] = useState(20), [after, setAfter] = useState(20)
  const [groups, setGroups] = useState<string[][]>(()=>{const segments=sectionSegments(section);return segments.some(s=>s.wellIds.length)?segments.map(s=>s.wellIds):[section.wellIds]})
  const [preview, setPreview] = useState<XY[] | null>(null), [error, setError] = useState('')
  useEffect(()=>{onPending?.(!!preview);return()=>onPending?.(false)},[preview,onPending])
  const points = section.profile
  const segments = mapSegments(section)
  const previewIssues = preview ? profileChangeIssues(section, preview) : []
  const calculate = () => {
    try {
      const ids=groups.flat();if(new Set(ids).size!==ids.length) throw new Error('Для расчёта назначьте каждую скважину только одному сегменту.')
      const bottoms = groups.map(ids => ids.filter(id => section.wellIds.includes(id)).map(id => sectionSources(section).find(w => w.id === id)!).filter(Boolean).map(w => pointAtDepth(w, w.depth)))
      setPreview(bottoms.length === 1 ? fitProfile(bottoms[0]!, before, after) : fitBrokenProfile(bottoms, before, after)); setError('')
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Не удалось рассчитать профиль.') }
  }
  return <section><h2>Сегменты профиля</h2><p className="section-muted">Каждая строка — один сегмент от начальной точки до конечной. Изменение трассы выполняется на карте. Длина профиля: {Number.isFinite(profileLength(points)) ? profileLength(points).toFixed(2) : '—'} м.</p>
    {profileIssues(points).length > 0 && <p role="alert" className="section-error">{profileIssues(points).join(' ')}</p>}
    <div className="section-table-scroll"><table className="section-table" aria-label="Сегменты профиля"><thead><tr><th>Сегмент</th><th>От X, м</th><th>От Y, м</th><th>До X, м</th><th>До Y, м</th></tr></thead><tbody>{segments.map(segment=><tr key={segment.id}><th scope="row">{segment.index+1}</th><td>{coordinateTransform(segment.a).x.toFixed(2)}</td><td>{coordinateTransform(segment.a).y.toFixed(2)}</td><td>{coordinateTransform(segment.b).x.toFixed(2)}</td><td>{coordinateTransform(segment.b).y.toFixed(2)}</td></tr>)}</tbody></table></div>
    {!section.mapGeometry && <details className="section-setup__details"><summary>Расчёт по забоям скважин</summary><div><p className="section-muted">Ортогональная МНК. Для каждого сегмента выберите не менее двух разных скважин; порядок первой и последней задаёт направление.</p>
    <div className="section-form"><label>Поле до первой, м<input type="number" min="0" value={before} disabled={disabled} onChange={e => setBefore(e.target.valueAsNumber)} /></label><label>Поле после последней, м<input type="number" min="0" value={after} disabled={disabled} onChange={e => setAfter(e.target.valueAsNumber)} /></label></div>
    {groups.map((ids, index) => <fieldset className="section-checks" key={index} disabled={disabled}><legend>Сегмент {index + 1}</legend>{sectionSources(section).filter(w => section.wellIds.includes(w.id)).map(w => <label key={w.id}><input type="checkbox" checked={ids.includes(w.id)} onChange={e => setGroups(groups.map((g, i) => i !== index ? g : e.target.checked ? [...g, w.id] : g.filter(id => id !== w.id)))} />{w.name}</label>)}{groups.length > 1 && <Button variant="quiet" onClick={() => setGroups(groups.filter((_, i) => i !== index))}>Удалить сегмент расчёта</Button>}</fieldset>)}
    <div className="section-actions"><Button variant="secondary" disabled={disabled} onClick={() => setGroups([...groups, []])}>Добавить сегмент расчёта</Button><Button disabled={disabled} onClick={calculate}>Рассчитать профиль</Button></div>
    {error && <p role="alert" className="section-error">{error}</p>}</div></details>}
    {preview && <WorkspaceDialog title="Предпросмотр профиля" size="compact" onClose={() => setPreview(null)} footer={<><Button variant="secondary" onClick={() => setPreview(null)}>Отмена</Button><Button disabled={disabled || previewIssues.length > 0} onClick={() => { const next=reconcileProfile(section,{...section,profile:preview}).section;onChange({...next,segmentWells:Object.fromEntries(sectionSegments(next).map((segment,i)=>[segment.id,groups[i]?.filter(id=>section.wellIds.includes(id))??[]]))});setPreview(null) }}>Применить профиль</Button></>}><p>Текущая трасса сохранится до применения. Состав скважин не изменяется.</p><ol>{preview.map((p, i) => <li key={i}>X {coordinateTransform(p).x.toFixed(2)} · Y {coordinateTransform(p).y.toFixed(2)} м</li>)}</ol>{previewIssues.length > 0 && <div role="alert" className="section-error"><p>Сначала скорректируйте зависимые объекты. Ручные координаты автоматически не переносятся.</p><ul>{previewIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}</WorkspaceDialog>}
  </section>
}

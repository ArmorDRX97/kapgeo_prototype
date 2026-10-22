import { mapSegments } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { useMemo, useState } from 'react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { assignSegmentWell } from '../../../entities/geology-section/lib/segments'
import { segmentRadius, withSegmentRadius } from '../../../entities/geology-section/lib/segmentRadius'
import { projectToProfile } from '../../../entities/geology-section/lib/profile'
import { Button } from '../../../shared/ui/Button'
import { assignWellToSegment, sectionWellCatalogue } from '../model/wellAssignment'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'

export function SegmentWellPicker({section,segmentId,onApply,onClose}:{section:GeologySection;segmentId:string;onApply:(s:GeologySection)=>void;onClose:()=>void}) {
  const [ids,setIds]=useState(section.segmentWells?.[segmentId]??[]),[candidate,setCandidate]=useState(''),[chosen,setChosen]=useState('')
  const segment=mapSegments(section).find(item=>item.id===segmentId)
  const [radiusM,setRadiusM]=useState(segmentRadius(section,segmentId))
  const wells=useMemo(()=>sectionWellCatalogue(section),[section])
  const [query,setQuery]=useState('')
  const distanceById=new Map(wells.map(well=>[well.id,segment?projectToProfile(well.collar,[segment.a,segment.b]).distance:Infinity]))
  const candidates=wells.filter(well=>(ids.includes(well.id)||(distanceById.get(well.id)??Infinity)<=radiusM+1e-7))
  const reorder=(delta:number)=>{const i=ids.indexOf(chosen),j=i+delta;if(i<0||j<0||j>=ids.length)return;const next=[...ids];[next[i],next[j]]=[next[j]!,next[i]!];setIds(next)}
  return <WorkspaceDialog title={`Скважины сегмента ${(segment?.index ?? 0) + 1}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={()=>{let next=withSegmentRadius(section,segmentId,radiusM);for(const id of section.segmentWells?.[segmentId]??[])next=assignSegmentWell(next,segmentId,id,false);for(const id of ids)next=next.wellIds.includes(id)?assignSegmentWell(next,segmentId,id,true):assignWellToSegment(next,segmentId,id);onApply(next);onClose()}}>Применить состав</Button></>}>
    <p className="section-muted">Выберите скважины месторождения рядом с линией сегмента. Новые скважины сразу добавятся в состав разреза. Расстояние считается от устья до отрезка.</p>
    <label className="section-well-picker__radius">Радиус подбора, м<input aria-label="Радиус подбора для сегмента, м" type="number" min="0" max="100000" step="5" value={Number.isFinite(radiusM)?radiusM:''} onChange={e=>{const value=e.currentTarget.valueAsNumber;if(Number.isFinite(value)&&value>=0&&value<=100000){setRadiusM(value);setCandidate('')}}} /></label>
    <p className="section-muted">Доступны скважины месторождения в радиусе {radiusM} м от сегмента.</p>
    <label className="section-search">Поиск доступной скважины<input value={query} onChange={e=>{setQuery(e.target.value);setCandidate('')}} placeholder="Название скважины" /></label>
    <div className="section-dual-list"><label>Доступные скважины<select aria-label="Доступные скважины" size={10} value={candidate} onChange={e=>setCandidate(e.target.value)}><option value="" disabled>Выберите скважину</option>{candidates.filter(w=>!ids.includes(w.id)&&w.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(w=><option key={w.id} value={w.id}>{w.name} · {(distanceById.get(w.id)??0).toFixed(1)} м</option>)}</select></label><div className="section-actions"><Button disabled={!candidate} onClick={()=>{setIds([...ids,candidate]);setCandidate('')}}>Добавить →</Button><Button disabled={!chosen} onClick={()=>{setIds(ids.filter(id=>id!==chosen));setChosen('')}}>← Исключить</Button><Button disabled={ids.indexOf(chosen)<=0} onClick={()=>reorder(-1)}>Вверх</Button><Button disabled={ids.indexOf(chosen)<0||ids.indexOf(chosen)===ids.length-1} onClick={()=>reorder(1)}>Вниз</Button></div><label>Скважины сегмента<select aria-label="Скважины сегмента" size={10} value={chosen} onChange={e=>setChosen(e.target.value)}><option value="" disabled>Выберите скважину</option>{ids.map(id=><option key={id} value={id}>{wells.find(w=>w.id===id)?.name??id}</option>)}</select></label></div>
    {query && !candidates.some(w=>!ids.includes(w.id)&&w.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && <p className="section-muted">По запросу ничего не найдено. Очистите поиск или увеличьте радиус.</p>}
    {candidates.filter(w=>!ids.includes(w.id)).length===0&&<p className="section-muted">В заданном радиусе нет доступных скважин. Увеличьте радиус подбора выше или выберите другой сегмент.</p>}
    <p className="section-muted">Назначение переносит скважину из другого сегмента. Исключение сохраняет её в общем составе разреза. Порядок списка сохраняется.</p>
  </WorkspaceDialog>
}

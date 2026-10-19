import { mapSegments, mapSources } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { useState } from 'react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { assignSegmentWell } from '../../../entities/geology-section/lib/segments'
import { projectToProfile } from '../../../entities/geology-section/lib/profile'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'

const defaultRadiusM = 20

export function SegmentWellPicker({section,segmentId,onApply,onClose}:{section:GeologySection;segmentId:string;onApply:(s:GeologySection)=>void;onClose:()=>void}) {
  const [ids,setIds]=useState(section.segmentWells?.[segmentId]??[]),[candidate,setCandidate]=useState(''),[chosen,setChosen]=useState('')
  const segment=mapSegments(section).find(item=>item.id===segmentId)
  const [radiusM,setRadiusM]=useState(section.profileRadiusM??defaultRadiusM)
  const wells=mapSources(section)
  const distanceById=new Map(wells.map(well=>[well.id,segment?projectToProfile(well.collar,[segment.a,segment.b]).distance:Infinity]))
  const candidates=wells.filter(well=>section.wellIds.includes(well.id)&&(ids.includes(well.id)||(distanceById.get(well.id)??Infinity)<=radiusM))
  const reorder=(delta:number)=>{const i=ids.indexOf(chosen),j=i+delta;if(i<0||j<0||j>=ids.length)return;const next=[...ids];[next[i],next[j]]=[next[j]!,next[i]!];setIds(next)}
  return <WorkspaceDialog title="Скважины линии сегмента" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={()=>{let next:GeologySection={...section,profileRadiusM:radiusM};for(const id of section.segmentWells?.[segmentId]??[])next=assignSegmentWell(next,segmentId,id,false);for(const id of ids)next=assignSegmentWell(next,segmentId,id,true);onApply(next);onClose()}}>Применить состав</Button></>}>
    <p className="section-muted">Выберите скважины из состава разреза рядом с линией сегмента. Расстояние считается от устья до отрезка.</p>
    <label className="section-well-picker__radius">Радиус подбора, м<input aria-label="Радиус подбора для сегмента, м" type="number" min="0" max="100000" step="5" value={Number.isFinite(radiusM)?radiusM:''} onChange={e=>{const value=e.currentTarget.valueAsNumber;if(Number.isFinite(value)&&value>=0&&value<=100000){setRadiusM(value);setCandidate('')}}} /></label>
    <p className="section-muted">Доступны скважины из состава разреза в радиусе {radiusM} м от сегмента.</p>
    <div className="section-dual-list"><label>Доступные скважины<select size={10} value={candidate} onChange={e=>setCandidate(e.target.value)}>{candidates.filter(w=>!ids.includes(w.id)).map(w=><option key={w.id} value={w.id}>{w.name} · {(distanceById.get(w.id)??0).toFixed(1)} м</option>)}</select></label><div className="section-actions"><Button disabled={!candidate} onClick={()=>{setIds([...ids,candidate]);setCandidate('')}}>Добавить →</Button><Button disabled={!chosen} onClick={()=>{setIds(ids.filter(id=>id!==chosen));setChosen('')}}>← Исключить</Button><Button disabled={ids.indexOf(chosen)<=0} onClick={()=>reorder(-1)}>Вверх</Button><Button disabled={ids.indexOf(chosen)<0||ids.indexOf(chosen)===ids.length-1} onClick={()=>reorder(1)}>Вниз</Button></div><label>Скважины сегмента<select size={10} value={chosen} onChange={e=>setChosen(e.target.value)}>{ids.map(id=><option key={id} value={id}>{wells.find(w=>w.id===id)?.name??id}</option>)}</select></label></div>
    {candidates.filter(w=>!ids.includes(w.id)).length===0&&<p className="section-muted">В заданном радиусе нет свободных скважин. Измените радиус в составе скважин разреза или проверьте линию сегмента.</p>}
    <p className="section-muted">Назначение переносит скважину из другого сегмента. Исключение сохраняет её в общем составе разреза. Порядок списка сохраняется.</p>
  </WorkspaceDialog>
}

import { useState } from 'react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { assignSegmentWell } from '../../../entities/geology-section/lib/segments'
import { changeSectionWells } from '../model/wells'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'

export function SegmentWellPicker({section,segmentId,onApply,onClose}:{section:GeologySection;segmentId:string;onApply:(s:GeologySection)=>void;onClose:()=>void}) {
  const [ids,setIds]=useState(section.segmentWells?.[segmentId]??[]),[candidate,setCandidate]=useState(''),[chosen,setChosen]=useState('')
  const wells=sectionSources(section), reorder=(delta:number)=>{const i=ids.indexOf(chosen),j=i+delta;if(i<0||j<0||j>=ids.length)return;const next=[...ids];[next[i],next[j]]=[next[j]!,next[i]!];setIds(next)}
  return <WorkspaceDialog title="Скважины линии сегмента" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={()=>{let next=changeSectionWells(section,[...new Set([...section.wellIds,...ids])]);for(const id of section.segmentWells?.[segmentId]??[])next=assignSegmentWell(next,segmentId,id,false);for(const id of ids)next=assignSegmentWell(next,segmentId,id,true);onApply(next);onClose()}}>Применить состав</Button></>}>
    <div className="section-dual-list"><label>Доступные скважины<select size={10} value={candidate} onChange={e=>setCandidate(e.target.value)}>{wells.filter(w=>!ids.includes(w.id)).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><div className="section-actions"><Button disabled={!candidate} onClick={()=>{setIds([...ids,candidate]);setCandidate('')}}>Добавить →</Button><Button disabled={!chosen} onClick={()=>{setIds(ids.filter(id=>id!==chosen));setChosen('')}}>← Исключить</Button><Button disabled={ids.indexOf(chosen)<=0} onClick={()=>reorder(-1)}>Вверх</Button><Button disabled={ids.indexOf(chosen)<0||ids.indexOf(chosen)===ids.length-1} onClick={()=>reorder(1)}>Вниз</Button></div><label>Скважины сегмента<select size={10} value={chosen} onChange={e=>setChosen(e.target.value)}>{ids.map(id=><option key={id} value={id}>{wells.find(w=>w.id===id)?.name??id}</option>)}</select></label></div>
    <p className="section-muted">Назначение переносит скважину из другого сегмента. Исключение сохраняет её в общем составе разреза. Порядок списка сохраняется; координаты и расстояния вдоль профиля не меняются.</p>
  </WorkspaceDialog>
}

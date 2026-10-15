import { SegmentWellPicker } from './SegmentWellPicker'
import { Button } from '../../../shared/ui/Button'
import { useEffect, useState } from 'react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { assignSegmentWell, projectSectionPoint, sectionSegments } from '../../../entities/geology-section/lib/segments'
import { pointAtDepth } from '../../../entities/geology-section/lib/profile'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { repairSection } from '../../../entities/geology-section/lib/repair'
import { changeSectionWells } from '../model/wells'

export function SegmentComposition({section,disabled,onChange,selectedIndex,onSelected,onPending}:{section:GeologySection;disabled:boolean;onChange:(s:GeologySection)=>void;selectedIndex?:number;onSelected?:(i:number)=>void;onPending?:(pending:boolean)=>void}) {
  const [picking,setPicking]=useState(false)
  const [localIndex,setLocalIndex]=useState(0),[error,setError]=useState(''),segments=sectionSegments(section),index=Math.min(selectedIndex??localIndex,Math.max(0,segments.length-1)),segment=segments[index]
  useEffect(()=>{onPending?.(picking);return()=>onPending?.(false)},[picking,onPending])
  if(!segment) return null
  return <details className="section-segment-composition section-setup__details"><summary>Сегменты и состав скважин</summary><div><h3>Разрез → сегмент → скважины</h3><Button disabled={disabled} onClick={()=>setPicking(true)}>Выбрать скважины сегмента…</Button>{picking&&<SegmentWellPicker section={section} segmentId={segment.id} onApply={onChange} onClose={()=>setPicking(false)}/>}<label>Рабочий сегмент<select value={index} onChange={e=>{const next=Number(e.target.value);setLocalIndex(next);onSelected?.(next)}}>{segments.map(s=><option key={s.id} value={s.index}>Сегмент {s.index+1} · {s.length.toFixed(1)} м</option>)}</select></label><p className="section-muted">От X {segment.a.x.toFixed(1)}, Y {segment.a.y.toFixed(1)} → до X {segment.b.x.toFixed(1)}, Y {segment.b.y.toFixed(1)}. Назначение закрепляет проекцию ствола за этим сегментом. Без назначения используется ближайший сегмент; при равном расстоянии — первый.</p>
    <div className="section-table-scroll"><table className="section-table" aria-label="Скважины выбранного сегмента"><thead><tr><th>Назначить</th><th>Скважина</th><th>Проекция</th><th>До сегмента, м</th></tr></thead><tbody>{sectionSources(section).map(w=>{
      const bottom=pointAtDepth(w,w.depth),projection=projectSectionPoint(section,w.id,bottom),assigned=segments.find(s=>s.wellIds.includes(w.id)),included=section.wellIds.includes(w.id)
      return <tr key={w.id}><td><input type="checkbox" aria-label={`${w.name}: назначить сегменту ${index+1}`} disabled={disabled} checked={segment.wellIds.includes(w.id)} onChange={e=>{
        const base=included?section:changeSectionWells(section,[...section.wellIds,w.id]),candidate=assignSegmentWell(base,segment.id,w.id,e.target.checked),repaired=repairSection(candidate)
        if(repaired.changes.length&&!window.confirm(`Изменится проекция и корреляция: ${repaired.changes.join(' ')} Продолжить?`))return
        try{onChange(repaired.section);setError('')}catch(e){setError(e instanceof Error?e.message:'Не удалось изменить состав сегмента.')}
      }}/></td><th scope="row">{w.name}</th><td>{!included?'Вне разреза':assigned?`Сегмент ${assigned.index+1}`:`Авто · ${projection.segment+1}`}</td><td>{projectSectionPoint({...section,segmentWells:{[segment.id]:[w.id]}},w.id,bottom).distance.toFixed(2)}</td></tr>
    })}</tbody></table></div>{error&&<p role="alert" className="section-error">{error}</p>}
  </div></details>
}

import type { GeologySection, SectionLayer, XZ } from '../../../entities/geology-section/model/types'
import { correlationIssues, layerAnchors, linkArc, sectionSources, stationAtDepth } from '../../../entities/geology-section/lib/correlation'
import { correlationHandles, moveCorrelationHandle } from './correlationHandles'
export function nearestEdge(points:XZ[],p:XZ,closed=false) {
  const edges=points.slice(1).map((b,i)=>({a:points[i]!,b,index:i+1}));if(closed&&points.length>2)edges.push({a:points.at(-1)!,b:points[0]!,index:points.length})
  return edges.map(e=>{const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z,t=Math.max(0,Math.min(1,((p.x-e.a.x)*dx+(p.z-e.a.z)*dz)/(dx*dx+dz*dz||1)));return {...e,distance:Math.hypot(p.x-e.a.x-t*dx,p.z-e.a.z-t*dz)}}).sort((a,b)=>a.distance-b.distance)[0]
}
export function correlationPointCommand(section:GeologySection,layer:SectionLayer,tool:'insert'|'delete'|'move',point:XZ):GeologySection {
  let next:GeologySection
  if(tool==='move') {
    const candidates=layerAnchors(section,layer).flatMap(a=>correlationHandles(section,layer,a.id)).map(handle=>({handle,d:Math.hypot(handle.point.x-point.x,handle.point.z-point.z)})).sort((a,b)=>a.d-b.d)
    if(!candidates[0])throw new Error('Нет доступной вспомогательной точки. Исходные контакты закреплены.')
    next=moveCorrelationHandle(section,layer,candidates[0].handle,point)
  } else if(tool==='delete') {
    const candidates=(section.arcEdits?.[layer]??[]).flatMap((e,i)=>e.points.map((p,j)=>({i,j,d:Math.hypot(p.x-point.x,p.z-point.z)}))).sort((a,b)=>a.d-b.d),c=candidates[0]
    if(!c)throw new Error('Нет свободной точки дуги для удаления.')
    next={...section,arcEdits:{...section.arcEdits,[layer]:section.arcEdits![layer]!.map((e,i)=>i===c.i?{...e,points:e.points.filter((_,j)=>j!==c.j)}:e)}}
  } else {
    const candidates=section.links[layer].flatMap(l=>(['top','bottom'] as const).map(edge=>({linkId:l.id,edge,points:linkArc(section,layer,l.id,edge)}))).filter(c=>point.x>c.points[0]!.x&&point.x<c.points.at(-1)!.x).map(c=>({...c,d:nearestEdge(c.points,point)?.distance??Infinity})).sort((a,b)=>a.d-b.d),c=candidates[0]
    if(!c)throw new Error('Выберите точку между опорами соединённых интервалов.')
    const edits=section.arcEdits?.[layer]??[],old=edits.find(e=>e.linkId===c.linkId&&e.edge===c.edge)
    const edit={linkId:c.linkId,edge:c.edge,smooth:old?.smooth??false,points:[...(old?.points??[]),point].sort((a,b)=>a.x-b.x)}
    next={...section,arcEdits:{...section.arcEdits,[layer]:[...edits.filter(e=>e!==old),edit]}}
  }
  const issues=correlationIssues(next,layer);if(issues.length)throw new Error(issues.join(' '));return next
}
export function addCanvasAuxiliary(section:GeologySection,layer:SectionLayer,a:XZ,b:XZ):GeologySection {
  const well=sectionSources(section).filter(w=>section.wellIds.includes(w.id)).sort((w,v)=>Math.abs(stationAtDepth(section,w,w.depth).x-a.x)-Math.abs(stationAtDepth(section,v,v.depth).x-a.x))[0]
  if(!well)throw new Error('Сначала добавьте скважину в разрез.')
  const md=(z:number)=>{const points=well.trajectory;for(let i=1;i<points.length;i++){const p=points[i-1]!,q=points[i]!;if(z<=p.z&&z>=q.z)return p.md+(p.z-z)/(p.z-q.z)*(q.md-p.md)}return well.collar.z-z}
  const from=Math.min(md(a.z),md(b.z)),to=Math.max(md(a.z),md(b.z));if(from<0||to<=from||to>well.depth+3)throw new Error('Укажите разные высоты в пределах скважины или допуска продления 3 м.')
  return {...section,auxiliary:[...(section.auxiliary??[]),{id:crypto.randomUUID(),wellId:well.id,layer,from,to}],participation:{...section.participation,[layer]:[...new Set([...section.participation[layer],well.id])]}}
}

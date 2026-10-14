import type { GeologySection, XY } from '../model/types'
import { distance, profileIssues, projectToProfile } from './profile'

export function vertexIds(section: GeologySection): string[] { return section.profileVertexIds ?? section.profile.map((_,i) => `${section.id}-v${i+1}`) }
export function sectionSegments(section: GeologySection) {
  const ids=vertexIds(section); let start=0
  return section.profile.slice(1).map((b,i)=>{ const a=section.profile[i]!,length=distance(a,b),segment={id:`${ids[i]}:${ids[i+1]}`,index:i,a,b,start,length,wellIds:section.segmentWells?.[`${ids[i]}:${ids[i+1]}`]??[]};start+=length;return segment })
}
/** Explicit membership wins over nearest segment; ties in legacy documents keep the first segment. */
export function projectSectionPoint(section: GeologySection, wellId: string, p: XY) {
  const assigned=sectionSegments(section).find(s=>s.wellIds.includes(wellId))
  if (!assigned || profileIssues(section.profile).length) return projectToProfile(p,section.profile)
  const local=projectToProfile(p,[assigned.a,assigned.b])
  return {...local,station:assigned.start+local.station,segment:assigned.index}
}
export function assignSegmentWell(section: GeologySection, segmentId: string, wellId: string, include: boolean): GeologySection {
  const segments=sectionSegments(section)
  return {...section,profileVertexIds:vertexIds(section),segmentWells:Object.fromEntries(segments.map(s=>[s.id,s.id===segmentId&&include?[...new Set([...s.wellIds,wellId])]:s.wellIds.filter(id=>id!==wellId)]))}
}
/** Stable vertex IDs follow reorder/move. Removed or split edges relinquish their memberships explicitly. */
export function reconcileProfile(before: GeologySection, next: GeologySection): { section:GeologySection; lost:number } {
  if (JSON.stringify(before.profile)===JSON.stringify(next.profile)) return {section:next,lost:0}
  const oldIds=vertexIds(before), used=new Set<string>()
  const supplied = next.profileVertexIds && next.profileVertexIds.length===next.profile.length && JSON.stringify(next.profileVertexIds)!==JSON.stringify(before.profileVertexIds) ? next.profileVertexIds : null
  const ids=supplied ?? next.profile.map((p,i)=>{
    const exact=before.profile.findIndex((old,j)=>old.x===p.x&&old.y===p.y&&!used.has(oldIds[j]!))
    const id=exact>=0?oldIds[exact]!:before.profile.length===next.profile.length&&!used.has(oldIds[i]!)?oldIds[i]!:crypto.randomUUID();used.add(id);return id
  })
  const candidate={...next,profileVertexIds:ids}, segments=sectionSegments(candidate), memberships:Record<string,string[]>={};let lost=0
  for(const [key,wells] of Object.entries(next.segmentWells??before.segmentWells??{})) {
    const direct=segments.find(s=>s.id===key), reverse=segments.find(s=>`${ids[s.index+1]}:${ids[s.index]}`===key)
    if(direct||reverse) memberships[(direct??reverse)!.id]=wells.filter(id=>next.wellIds.includes(id));else lost+=wells.length
  }
  return {section:{...candidate,segmentWells:memberships},lost}
}
export function segmentMembershipIssues(section: GeologySection): string[] {
  const ids=vertexIds(section),segments=sectionSegments(section), used=new Set<string>(),errors:string[]=[]
  if(ids.length!==section.profile.length||new Set(ids).size!==ids.length) errors.push('Проверьте идентификаторы вершин профиля.')
  for(const [id,wells] of Object.entries(section.segmentWells??{})) {
    if(!segments.some(s=>s.id===id)) errors.push('Скважины ссылаются на удалённый сегмент.')
    for(const well of wells) {if(!section.wellIds.includes(well)||used.has(well)) errors.push('Скважина должна входить в разрез и назначаться одному сегменту.');used.add(well)}
  }
  return [...new Set(errors)]
}

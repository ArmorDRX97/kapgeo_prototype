import { describe,expect,it } from 'vitest'
import { createSection, initialSections } from '../model/fixtures'
import { assignSegmentWell,projectSectionPoint,reconcileProfile,sectionSegments,segmentMembershipIssues,vertexIds } from './segments'
import { layerAnchors,sourceAnchorPoint } from './correlation'
import { validateSection } from '../../../repository/demo/sectionRepository'

describe('persistent directed segment membership',()=>{
  const sample=()=>({...createSection('segments','Segments'),profile:[{x:0,y:0},{x:100,y:0},{x:100,y:100}],wellIds:['GTR-W1'],sourceRevisions:{'GTR-W1':1}})
  it('honors explicit assignment, moves it between segments and keeps legacy nearest fallback',()=>{
    const p=sample(),segments=sectionSegments(p),point={x:95,y:40}
    expect(projectSectionPoint(p,'GTR-W1',point).segment).toBe(1)
    const assigned=assignSegmentWell(p,segments[0]!.id,'GTR-W1',true)
    expect(projectSectionPoint(assigned,'GTR-W1',point)).toMatchObject({segment:0,station:95,distance:40})
    const moved=assignSegmentWell(assigned,segments[1]!.id,'GTR-W1',true)
    expect(sectionSegments(moved)[0]!.wellIds).toEqual([]);expect(segmentMembershipIssues(moved)).toEqual([])
  })
  it('follows stable vertices across coordinate edits/reverse and reports removed-edge links',()=>{
    const base=sample(),assigned=assignSegmentWell(base,sectionSegments(base)[0]!.id,'GTR-W1',true)
    const moved=reconcileProfile(assigned,{...assigned,profile:assigned.profile.map((p,i)=>i===1?{x:120,y:0}:p)}).section
    expect(vertexIds(moved)).toEqual(vertexIds(assigned));expect(sectionSegments(moved)[0]!.wellIds).toEqual(['GTR-W1'])
    const reverse=reconcileProfile(assigned,{...assigned,profile:[...assigned.profile].reverse()})
    expect(reverse.lost).toBe(0);expect(sectionSegments(reverse.section)[1]!.wellIds).toEqual(['GTR-W1'])
    const removed=reconcileProfile(assigned,{...assigned,profile:[assigned.profile[0]!,assigned.profile[2]!]})
    expect(removed.lost).toBe(1);expect(segmentMembershipIssues(removed.section)).toEqual([])
  })
  it('rejects missing edges, duplicate assignment and preserves stage/links through storage schema',()=>{
    const p=sample(),a=assignSegmentWell(p,sectionSegments(p)[0]!.id,'GTR-W1',true)
    expect(segmentMembershipIssues({...a,segmentWells:{...a.segmentWells,[sectionSegments(a)[1]!.id]:['GTR-W1']}}).length).toBeGreaterThan(0)
    expect(segmentMembershipIssues({...a,segmentWells:{deleted:['GTR-W1']}}).length).toBeGreaterThan(0)
    const checked=validateSection({...a,stage:'detailed'})
    expect(checked.stage).toBe('detailed');expect(checked.segmentWells).toEqual(a.segmentWells)
  })
  it('keeps source contacts at from/to when the contour bottom is extended',()=>{
    const p=initialSections()[0]!,a=layerAnchors(p,'technology')[0]!,source=sourceAnchorPoint(p,a,'bottom')
    const edited={...p,bottomExtensions:{[a.id]:source.z-2}},b=layerAnchors(edited,'technology').find(b=>b.id===a.id)!
    expect(b.bottom.z).toBe(source.z-2);expect(sourceAnchorPoint(edited,b,'bottom')).toEqual(source)
  })
})

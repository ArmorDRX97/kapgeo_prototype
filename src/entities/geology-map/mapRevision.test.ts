import { describe, expect, it } from 'vitest'
import { bindNode, boundWells, snapToWell } from './anchors'
import { initialMaps, legacyInitialMaps, changedNode } from './fixtures'
import { upgradeMap } from './migrate'
import { defaultMapGrid, projectSchema } from './model'
import { mapGridTicks } from './grid'
import { wellSymbol, wellSymbolPath } from './wellSymbols'
import { planSvg } from '../../features/geology-plan/export'

describe('video audit map contracts',()=>{
  it('migrates untouched demo content without touching a custom area, removed well or raw object',()=>{
    const old=legacyInitialMaps()[0]!,area=structuredClone(old.objects.find(o=>o.id==='area-0')!)
    area.name='Моя область';old.objects=old.objects.filter(o=>o.id!=='well-1').map(o=>o.id===area.id?area:o)
    const before=structuredClone(old),next=upgradeMap(old)
    expect(old).toEqual(before);expect(next.objects.find(o=>o.id===area.id)).toEqual(area)
    expect(next.objects.some(o=>o.id==='area-1')).toBe(false);expect(next.objects.some(o=>o.id==='well-1')).toBe(false)
    expect(next.layers.some(l=>l.id==='zones')).toBe(true);expect(projectSchema.safeParse(next).success).toBe(true)
    expect(upgradeMap(next)).toBe(next)
  })
  it('stores a well anchor, prevents accidental free dragging and supports explicit detach/rebind',()=>{
    const p=initialMaps()[0]!,block=p.objects.find(o=>o.kind==='block')!,n=block.parts[0]!.nodes[0]!,well=p.objects.find(o=>o.kind==='well')!
    expect(boundWells(block).length).toBeGreaterThan(3)
    expect(changedNode(block,n.id,{x:0,y:0})).toEqual(block)
    const rebound=bindNode(p,block,n.id,{wellId:well.id,target:'collar'})
    expect(rebound.parts[0]!.nodes[0]).toMatchObject({...well.parts[0]!.nodes[0],id:n.id,anchor:{wellId:well.id,target:'collar'}})
    const detached=bindNode(p,rebound,n.id)
    expect(changedNode(detached,n.id,{x:123}).parts[0]!.nodes[0]!.x).toBe(123)
    expect(projectSchema.safeParse({...p,objects:p.objects.map(o=>o.id===block.id?rebound:o)}).success).toBe(true)
    expect(projectSchema.safeParse({...p,objects:p.objects.map(o=>o.id===block.id?{...block,parts:[{...block.parts[0]!,nodes:block.parts[0]!.nodes.map((v,i)=>i===0?{...v,x:0}:v)}]}:o)}).success).toBe(false)
  })
  it('retains edited legacy source geometry and names while resolving new anchors without collisions',()=>{
    const old=legacyInitialMaps()[0]!,fresh=initialMaps()[0]!,target=fresh.objects.find(o=>o.id==='block-0')!.parts[0]!.nodes[0]!.anchor!.wellId,well=old.objects.find(o=>o.id===target)!
    well.parts[0]!.nodes[0]!.x+=12;well.name=fresh.objects.find(o=>o.kind==='well'&&o.id!==target)!.name
    const next=upgradeMap(old)
    expect(next.objects.find(o=>o.id===well.id)).toEqual(well)
    expect(projectSchema.safeParse(next).success).toBe(true)
    expect(next.objects.find(o=>o.id==='block-0')!.parts[0]!.nodes[0]!.x).toBe(well.parts[0]!.nodes[0]!.x)
  })
  it('snaps only visible targets and stores the chosen collar/bottom identity',()=>{
    const p=initialMaps()[0]!,well=p.objects.find(o=>o.kind==='well')!,bottom=well.parts[0]!.nodes[1]!
    expect(snapToWell(p,bottom,1,'bottom').anchor).toEqual({wellId:well.id,target:'bottom'})
    expect(snapToWell({...p,layers:p.layers.map(l=>({...l,visible:l.id!=='wells'}))},bottom,1,'bottom').anchor).toBeUndefined()
  })
  it('keeps the cross inside the collar in the common screen/print symbol and explicit type colors',()=>{
    expect(wellSymbolPath({x:10,y:20},{x:50,y:70},5)).toEqual({direction:'M10,20L50,70',cross:'M7,20h6M10,17v6'})
    expect(wellSymbol('Неизвестная').color).toBe('#697781')
    const p=initialMaps()[0]!,svg=planSvg(p,{x:60600,y:94900,scale:2}),doc=new DOMParser().parseFromString(svg,'image/svg+xml')
    expect(doc.querySelectorAll('[data-well-cross]')).toHaveLength(180)
    expect(doc.querySelector('[data-well-direction]')?.getAttribute('d')).not.toMatch(/[hv]/)
    expect(svg).toContain('предварительная палитра');expect(svg).toContain('Откачная')
    const unknown={...p,objects:p.objects.map(o=>o.kind==='well'?{...o,attributes:{...o.attributes,type:'Неизвестная'}}:o)}
    expect(planSvg(unknown,{x:60600,y:94900,scale:2})).toContain('Неизвестная')
  })
  it('offsets exact grid graduations and bounds dense drawing work',()=>{
    expect(mapGridTicks(0,100,20,{...defaultMapGrid,step:25,dx:5},'x')).toEqual([5,30,55,80])
    expect(mapGridTicks(0,1e6,20,{...defaultMapGrid,step:1},'y').length).toBeLessThanOrEqual(501)
  })
})

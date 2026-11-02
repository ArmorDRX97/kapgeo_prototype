import { afterEach, describe, expect, it } from 'vitest'
import { composeReferenceSvg, loadReferenceSettings, referenceDefaults, referenceSize, referenceStorageKey } from './referenceModel'
afterEach(()=>localStorage.clear())
describe('reference passport document controls',()=>{
 const raw='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63800 153000"><text>Составил:</text><text>год</text><text>1:50</text><path d="M0 0L1 1"/></svg>'
 it('preserves the supplied document exactly until an edit and recomposes removed columns and depth range',()=>{
  const initial=referenceDefaults()
  expect(composeReferenceSvg(raw,initial)).toBe(raw)
  const edited={...initial,columns:initial.columns.filter(c=>c!=='curves'),from:650,to:660,scale:100 as const}
  expect(referenceSize(edited)).toEqual({width:53300,height:32000})
  const result=composeReferenceSvg(raw,edited)
  expect(new DOMParser().parseFromString(result,'image/svg+xml').querySelector('parsererror')).toBeNull()
  expect(result).toContain('viewBox="0 0 53300 32000"')
  expect(result).toContain('25800')
  const embedded=new DOMParser().parseFromString(result,'image/svg+xml').getElementById('reference-source')!.getAttribute('href')!
  expect(decodeURIComponent(embedded.slice(embedded.indexOf(',')+1))).toContain('1:100')
 })
 it('isolates settings per supplied passport and rejects an unusable composition',()=>{
  const edited={...referenceDefaults(),columns:['samples' as const],color:false}
  localStorage.setItem(referenceStorageKey('127-2-2'),JSON.stringify(edited))
  expect(loadReferenceSettings('127-2-2')).toEqual(edited)
  expect(loadReferenceSettings('127-2-3-1')).toEqual(referenceDefaults())
  for(const patch of [{columns:[]},{columns:['unknown']},{from:700,to:650},{scale:0}]){
   localStorage.setItem(referenceStorageKey('127-2-2'),JSON.stringify({...edited,...patch}))
   expect(loadReferenceSettings('127-2-2')).toEqual(referenceDefaults())
  }
 })
})

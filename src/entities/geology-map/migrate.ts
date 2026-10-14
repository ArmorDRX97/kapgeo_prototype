import { legacyInitialMaps } from './fixtures'
import { cleanMapScene } from './cleanScene'
import type { MapProject } from './model'

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(value)
}
/** Only untouched demo objects are replaced. User objects, edits and deletions survive. No storage writes. */
export function upgradeMap(project: MapProject): MapProject {
  if (project.sceneVersion === 2) return project
  const baseline = legacyInitialMaps().find(p => p.id === project.id && p.objects.length)
  if (!baseline) return { ...project, sceneVersion: 2 }
  const fresh = cleanMapScene(baseline), preserved = new Set<string>(), replaced = new Set<string>()
  const objects = project.objects.flatMap(o => {
    const original = baseline.objects.find(b => b.id === o.id)
    if (original && canonical(original) === canonical(o)) { const next = fresh.objects.find(n => n.id === o.id); if(next)replaced.add(o.id);return next ? [next] : [] }
    preserved.add(o.layerId); return [o]
  })
  // A user may have removed a source well in the previous version. Do not recreate it.
  const wells = new Map(objects.filter(o => o.kind === 'well').map(o => [o.id,o]))
  const names = new Set(objects.filter(o=>o.kind==='well'&&!replaced.has(o.id)).map(o=>o.name.toLocaleLowerCase()))
  const safeObjects = objects.map(o => {
    let name=o.name
    if(o.kind==='well'&&replaced.has(o.id)){while(names.has(name.toLocaleLowerCase()))name+=` · ${o.id}`;names.add(name.toLocaleLowerCase())}
    return { ...o,name, parts: o.parts.map(part => ({ ...part, nodes: part.nodes.map(n => {
      if(!n.anchor)return n
      const target=wells.get(n.anchor.wellId)?.parts[0]?.nodes[n.anchor.target==='collar'?0:1]
      return target?{...n,x:target.x,y:target.y}:{...n,anchor:undefined}
    }) })) }
  })
  for (const l of project.layers) {
    const old = baseline.layers.find(b => b.id === l.id)
    if (!old || canonical(old) !== canonical(l)) preserved.add(l.id)
  }
  for (const id of [...preserved]) { let parent = project.layers.find(l => l.id === id)?.parentId; while (parent) { preserved.add(parent); parent = project.layers.find(l => l.id === parent)?.parentId } }
  const layers = [...fresh.layers.map(l => preserved.has(l.id) ? project.layers.find(old => old.id === l.id) ?? l : l), ...project.layers.filter(l => preserved.has(l.id) && !fresh.layers.some(n => n.id === l.id))]
  return { ...project, sceneVersion: 2, objects: safeObjects, layers, migrationNote: 'Карта обновлена. Личные построения, изменённые объекты и удаления сохранены; запись в браузер выполняется кнопкой «Сохранить план».' }
}

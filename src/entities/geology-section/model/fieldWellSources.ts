import { depositField } from '../../geology-map/fieldScene'
import { fromFieldPoint } from '../lib/fieldPlacement'
import type { SectionWellSource } from './types'

// Same local map fixture; geological samples are made only for wells included in a section.
export const sectionFieldWells = depositField.objects.filter(o => o.kind === 'well')
export const sectionFieldWellById = new Map(sectionFieldWells.map(w => [w.id, w]))
const sources = new Map<string, SectionWellSource>()
export function fieldWellSource(id: string): SectionWellSource | undefined {
  const cached = sources.get(id)
  if (cached) return cached
  const object = sectionFieldWellById.get(id)
  if (!object) return undefined
  const head = fromFieldPoint(object.parts[0]!.nodes[0]!), bottom = fromFieldPoint(object.parts[0]!.nodes.at(-1)!)
  const depth = object.attributes.depth, collar = { ...head, z: 0 }
  const band = (name: string, from: number, to: number, kind: 'permeable' | 'impermeable' = 'permeable') => ({ id: name, from, to: Math.min(to, depth), kind })
  const source: SectionWellSource = {
    id, name: object.name, revision: 1, collar, depth,
    trajectory: [{ md: 0, ...collar }, { md: depth, ...bottom, z: -Math.sqrt(Math.max(1, depth ** 2 - (bottom.x - head.x) ** 2 - (bottom.y - head.y) ** 2)) }],
    technology: [band('T-U', depth * .87, depth * .9), band('T-L', depth * .93, depth * .97)],
    ore: [band('O-U', depth * .875, depth * .89), band('O-L', depth * .94, depth * .955)],
    uncorrected: [band('R-U', depth * .872, depth * .895), band('R-L', depth * .935, depth * .96)],
    offbalance: [band('B-M', depth * .905, depth * .92, 'impermeable')],
    lithology: [{ id: 'L-U', from: 0, to: depth * .87, rock: 'clay' }, { id: 'L-S', from: depth * .87, to: depth * .97, rock: 'sand' }, { id: 'L-B', from: depth * .97, to: depth, rock: 'silt' }],
    curves: [{ id: 'gr', name: 'ГК', unit: 'мкР/ч', min: 0, max: 100, samples: Array.from({ length: 81 }, (_, i) => ({ md: depth * i / 80, value: 44 + 20 * Math.sin(i * .51 + head.x) })) }],
  }
  sources.set(id, source)
  return source
}

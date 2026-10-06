import type { CurveSpec } from '@kapgeo/geo-viz/wellog'
import type { CoreSource, InterpretationWell, LithologyInterval, Rock } from './types'
import { initialMapping } from '../lib/core'

const interval = (id: string, from: number, to: number, rock: Rock): LithologyInterval => ({ id, from, to, rock, mineralization: '', minerals: [], color: rock === 'clay' ? 'gray' : rock === 'sand' ? 'yellow' : 'brown', note: '' })
function curves(phase: number): CurveSpec[] {
  const depths = Float64Array.from({ length: 1601 }, (_, i) => i / 10)
  const rs = Float64Array.from(depths, d => d >= 128.4 && d <= 129.1 ? Number.NaN :
    Math.max(1.5, 18 + 10 * Math.sin(d * 0.9 + phase) + 4 * Math.sin(d * 3.2) + (d > 119 && d < 124 ? 30 : 0) + (d > 131 && d < 134 ? 24 : 0)))
  return [
    { id: 'rs-main', name: 'КС · основной', type: 'RS', unit: 'Ом·м', scale: { min: 1, max: 100, log: true }, data: { depths, values: rs } },
    { id: 'gr-main', name: 'ГК', type: 'GR', unit: 'мкР/ч', scale: { min: 0, max: 100 }, data: { depths,
      values: Float64Array.from(depths, (d, i) => 25 + 15 * Math.sin(d * 0.65 + phase) + 4 * Math.sin(d * 4) + ((rs[i] ?? 0) < 15 ? 28 : 0)) } },
    { id: 'rs-control', name: 'КС · контрольный', type: 'RS', unit: 'Ом·м', scale: { min: 1, max: 100, log: true }, data: { depths,
      values: Float64Array.from(rs, (v, i) => v * (0.86 + 0.12 * Math.sin(i * 0.09))) } },
  ]
}
function well(id: string, code: string, phase: number, status: 'draft' | 'locked', empty = false): InterpretationWell {
  const sourceLithology = [interval('src-0', 0, 112, 'sandstone'), interval('src-1', 112, 116, 'clay'), interval('src-2', 116, 118, 'sand'),
    interval('src-3', 120, 123, 'sand'), interval('src-4', 123, 127, 'silt'), interval('src-5', 128, 131, 'clay'), interval('src-6', 131, 136, 'sand'), interval('src-7', 136, 160, 'limestone')]
  const core: CoreSource[] = empty ? [] : [
    { id: 'seg-1', runId: 'run-1', from: 112, to: 118, lithology: sourceLithology.filter(r => r.from >= 112 && r.to <= 118), measurements: [{ id: 'm-1', depth: 114, value: 14 }, { id: 'm-2', depth: 117, value: 35 }] },
    { id: 'seg-2', runId: 'run-2', from: 120, to: 127, lithology: sourceLithology.filter(r => r.from >= 120 && r.to <= 127), measurements: [{ id: 'm-3', depth: 121, value: 47 }, { id: 'm-4', depth: 125, value: 19 }] },
    { id: 'seg-3', runId: 'run-3', from: 128, to: 136, lithology: sourceLithology.filter(r => r.from >= 128 && r.to <= 136), measurements: [{ id: 'm-5', depth: 130, value: 11 }, { id: 'm-6', depth: 133, value: 41 }] },
  ]
  const interpreted = [interval('lit-1', 0, 112, 'sandstone'), interval('lit-2', 112, 117.4, 'clay'), interval('lit-3', 117.4, 124, 'sand'),
    interval('lit-4', 124, 130.5, 'silt'), interval('lit-5', 130.5, 136, 'sand'), interval('lit-6', 136, 160, 'limestone')]
  return { id, code, label: empty ? 'Без каротажа и керна' : status === 'locked' ? 'Зафиксирована' : 'Разведочная скважина', depth: 160, scope: 'interpretation-demo', status,
    curves: empty ? [] : curves(phase), initialRange: [112, 136], sourceLithology: core.flatMap(s => s.lithology), sourceRevision: 'fixture-v2',
    runs: empty ? [] : [{ id: 'run-1', from: 112, to: 120, recovered: 6 }, { id: 'run-2', from: 120, to: 128, recovered: 7 }, { id: 'run-3', from: 128, to: 136, recovered: 8 }], core,
    samples: empty ? [] : [{ id: 'sample-1', name: 'КП-01', kind: 'KP', assay: 0.024, parts: [{ segmentId: 'seg-1', from: 113, to: 114.5 }] },
      { id: 'sample-2', name: 'КП-02', assay: 0.041, parts: [{ segmentId: 'seg-2', from: 121, to: 122 }, { segmentId: 'seg-2', from: 124, to: 125 }] },
      { id: 'sample-3', name: 'КП-03', assay: 0.018, parts: [{ segmentId: 'seg-3', from: 131.5, to: 133 }] },
      { id: 'sample-gs', name: 'ГС-01', kind: 'GS', assay: 0.12, parts: [{ segmentId: 'seg-1', from: 115, to: 116 }] },
      { id: 'sample-lgh', name: 'ЛГХ-01', kind: 'LGH', assay: 0.032, parts: [{ segmentId: 'seg-2', from: 122, to: 124 }] },
      { id: 'sample-tp', name: 'ТП-01', kind: 'TP', assay: 0.09, parts: [{ segmentId: 'seg-3', from: 130, to: 134 }] }],
    initial: { wellId: id, logLithology: interpreted.map(r => ({ ...r, color: undefined })), compositeLithology: interpreted.map(r => ({ ...r, id: `com-${r.id}` })),
      technology: empty ? [] : [{ id: 'tech-1', from: 112, to: 117.4, kind: 'impermeable', source: 'manual' }, { id: 'tech-2', from: 117.4, to: 124, kind: 'permeable', source: 'manual' },
        { id: 'tech-3', from: 124, to: 130.5, kind: 'impermeable', source: 'manual' }, { id: 'tech-4', from: 130.5, to: 136, kind: 'permeable', source: 'manual' }],
      core: core.map(s => ({ id: s.id, runId: s.runId, from: s.from, to: s.to, reversed: false })), calculation: null, revision: 0 },
  }
}
export const interpretationWells = [well('int-demo-01', 'WELL-101', 0, 'draft'), well('int-demo-02', 'WELL-102', 0.8, 'locked'), well('int-demo-03', 'WELL-103', 1.2, 'draft', true)]
for (const subject of interpretationWells) { subject.initial.core = initialMapping(subject); subject.initial.samples = structuredClone(subject.samples); subject.initial.sourceRevision = subject.sourceRevision }
const stale = well('int-demo-04', 'WELL-104', 0.4, 'draft')
stale.label = 'Устаревшая привязка'; stale.initial.core = initialMapping(stale); stale.initial.sourceRevision = 'fixture-v1'; stale.initial.samples = structuredClone(stale.samples)
interpretationWells.push(stale)

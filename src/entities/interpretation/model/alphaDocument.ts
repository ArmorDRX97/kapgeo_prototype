import { calculateCaliper, calculateControls, calculateCurrent, calculateElectro, calculateFlow, calculateGamma, calculateMetal, calculateThermal, electroMetrics } from '../lib/alphaCalculations'
import type { AlphaDocument, Result } from './alphaTypes'
import type { InterpretationDocument, InterpretationWell } from './types'
const empty = <T>(): Result<T> => ({ rows: [], fingerprint: '', version: 'alpha-prototype-1', note: '' })
export function createAlphaDocument(well: InterpretationWell, legacy?: InterpretationDocument): AlphaDocument {
  const doc: AlphaDocument = { schemaVersion: 1, wellId: well.id, revision: 0, derived: [],
    parameters: {
      electro: { recordId: 'alpha-rs', from: 112, to: 140, mode: 'detail', probe: 'bottom', length: 1, normalization: 1, levels: [12, 25, 40], minThickness: 0.5, permeableKf: 1 },
      gamma: { recordId: 'alpha-gr', caliperId: 'alpha-km', from: 112, to: 140, stage: 'final', algorithm: 'weighted', background: 22, conversion: 0.0002, absorption: 1.1, moisture: 18, density: 1.65, krr: 0.8, cutoff: 0.015, balanceCutoff: 0.05, gap: 0.2, minThickness: 0.2, nominalDiameter: 161, transform: true, useCaliper: true, useMorphology: false },
      current: { recordId: 'alpha-tk', from: 117.5, to: 135, sumpBottom: 138, note: 'Фактические границы проверены по характерным точкам ТК.' },
      thermal: { recordId: 'alpha-tm', inductionId: 'alpha-il', backgroundFrom: 98, backgroundTo: 145, backgroundTop: 20.842, backgroundBottom: 22.205, autoBackground: true, interpretable: true, note: '' },
      caliper: { recordId: 'alpha-kmr', from: 112, to: 143, target: 320, casingDiameter: 90, filterDiameter: 118, projectFrom: 115, projectTo: 139, gravelMode: 'filter', above: 3, below: 3, gravelFrom: 114.5, gravelTo: 138 },
      flow: { recordId: 'alpha-flow', total: 10, mode: 'injection', step: 0.5, grouping: 'step' },
      controls: { mainId: 'alpha-gr', controlId: 'alpha-gr-control', type: 'production', from: 116, to: 136, controlFrom: 116, controlTo: 136, referenceArea: 1360, tolerance: 10, depthTolerance: 0.2, thicknessTolerance: 0.07, note: '' },
    }, electro: empty(), gamma: empty(), current: empty(), thermal: empty(), metal: empty(), caliper: empty(), flow: empty(), controls: empty(),
    sections: [{ id: 'filter-section-1', from: 117.5, to: 123 }, { id: 'filter-section-2', from: 123, to: 129 }, { id: 'filter-section-3', from: 129, to: 135 }],
    projects: [{ id: 'project-filter', from: 117, to: 135, kind: 'filter', label: 'Проектный фильтр' }, { id: 'project-bentonite', from: 112, to: 116, kind: 'bentonite', label: 'Основные бентогильзы' }],
    oxidation: [{ id: 'zpo-1', from: 118, to: 121 }], filterProposal: { from: 117, to: 135 }, zadr: { above: 2, below: 6, includeOffbalance: true },
    passport: { from: 98, to: 143, scale: 200, compiledBy: 'Геолог', note: '' },
  }
  if (!well.curves.length) return doc
  doc.electro = calculateElectro(well, doc)
  if (legacy?.logLithology.length) { doc.electro.rows = legacy.logLithology.filter(r => r.to > 112 && r.from < 140).map(r => electroMetrics(well, doc, { id: `legacy-${r.id}`, from: Math.max(112, r.from), to: Math.min(140, r.to) }, r.rock)); doc.electro.note = 'Литология перенесена из прежнего сохранения; исходный документ оставлен без изменений.' }
  doc.current = calculateCurrent(well, doc); doc.thermal = calculateThermal(well, doc); doc.metal = calculateMetal(well, doc)
  doc.gamma = calculateGamma(well, doc); doc.caliper = calculateCaliper(well, doc); doc.flow = calculateFlow(well, doc); doc.controls = calculateControls(well, doc)
  return doc
}

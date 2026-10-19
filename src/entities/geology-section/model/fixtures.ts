import type { GeologySection, SectionWellSource } from './types'

/** Entirely invented local metric coordinates. No BGD/interpretation IDs or production sources. */
export const sectionWellSources: SectionWellSource[] = Array.from({ length: 7 }, (_, i) => {
  const collar = { x: 35 + i * 65, y: 40 + i * 12 + (i % 2) * 18, z: 105 + (i % 3) * 2 }
  const offset = (i % 3) * 1.4
  const interval = (prefix: string, from: number, to: number) => ({ id: `${prefix}-${i}`, from: from + offset, to: to + offset, kind: 'permeable' as const })
  return {
    id: `GTR-W${i + 1}`, name: `ГС-${101 + i}`, collar, depth: 145, revision: 1,
    trajectory: [{ md: 0, ...collar }, { md: 145, x: collar.x + (i % 2) * 12, y: collar.y + (i % 2) * 8, z: collar.z - (i % 2 ? 144.28 : 145) }],
    technology: [interval('TI-A', 109, 116), interval('TI-B', 121, 130)],
    ore: [interval('ORE-A', 111, 114), interval('ORE-B', 123, 126)],
    uncorrected: [interval('RAW-A', 110, 115), interval('RAW-B', 122, 128)],
    offbalance: [{ ...interval('OFF-A', 117, 119), kind: 'impermeable' }],
    lithology: [{ id: `L-A-${i}`, from: 90, to: 109 + offset, rock: 'clay' }, { id: `L-B-${i}`, from: 109 + offset, to: 116 + offset, rock: 'sand' }, { id: `L-C-${i}`, from: 116 + offset, to: 121 + offset, rock: 'silt' }, { id: `L-D-${i}`, from: 121 + offset, to: 130 + offset, rock: 'sand' }, { id: `L-E-${i}`, from: 130 + offset, to: 145, rock: 'clay' }],
    curves: [{ id: 'rs', name: 'КС', unit: 'Ом·м', min: 0, max: 80, samples: Array.from({ length: 221 }, (_, n) => ({ md: 90 + n / 4, value: n > 90 && n < 98 && i === 2 ? null : 35 + 18 * Math.sin(n * 0.17 + i) + 7 * Math.cos(n * 0.43) })) }, { id: 'gr', name: 'ГК', unit: 'мкР/ч', min: 0, max: 100, samples: Array.from({ length: 111 }, (_, n) => ({ md: 90 + n / 2, value: 40 + 26 * Math.sin(n * .12 + i) })) }],
  }
})

export function createSection(id: string, title: string): GeologySection {
  return { schemaVersion: 1, id, revision: 0, synthetic: true, scope: 'geology-section-prototype', title,
    depositId: 'GTR-LOCAL-NORTH', depositName: 'Полигон Северный', stage: 'exploration', kind: 'main', year: 2026, description: '', top: 10, bottom: -45, status: 'draft',
    profile: [{ x: 0, y: 30 }, { x: 470, y: 125 }], wellIds: [], sourceRevisions: {}, profileRadiusM: 20,
    participation: { technology: [], ore: [], uncorrected: [], offbalance: [] }, links: { technology: [], ore: [], uncorrected: [], offbalance: [] }, graphics: [], drawings: [] }
}

export function initialSections(): GeologySection[] {
  const section = createSection('GTR-01', 'Северный · профиль 01')
  section.wellIds = sectionWellSources.slice(0, 5).map(w => w.id)
  section.sourceRevisions = Object.fromEntries(sectionWellSources.slice(0, 5).map(w => [w.id, w.revision]))
  for (const layer of ['technology', 'ore', 'uncorrected'] as const) section.participation[layer] = [...section.wellIds]
  const parallel = createSection('GTR-02', 'Северный · профиль 02')
  parallel.profile = [{ x: 0, y: 75 }, { x: 160, y: 78 }, { x: 350, y: 74 }]
  parallel.metadata = { mapProfileGroup: 'north-demo', mapProfileOrder: 2, depositBody: '', createdOn: '', compiledBy: '', checkedBy: '' }
  return [section, { ...parallel, status: 'locked', description: 'Зафиксированный параллельный разрез для просмотра.' }]
}

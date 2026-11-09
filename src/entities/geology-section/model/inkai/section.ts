import { createSection } from '../fixtures'
import type { GeologySection, SectionGraphic, SectionLayer } from '../types'
import { layerAnchors, linksAtAnchor, pinchBounds } from '../../lib/correlation'
import { newDrawing } from '../../lib/drawing'
import { graphicIssues } from '../../lib/geometry'
import { inkaiBottom, inkaiDeposit, inkaiElevation, inkaiLength, inkaiSectionId, inkaiStation, inkaiTop, inkaiWells } from './sources'
import contours from './contours.json'

const lithologyOutline = [
  [126,102], [1625,102], [1625,954], [1560,984], [1490,1031], [1417,1072],
  [1312,1070], [1229,1072], [1140,1015], [1050,1019], [961,1056],
  [875,1040], [782,980], [692,1016], [602,1049], [516,1050], [417,1054],
  [377,1045], [315,1105], [239,1045], [149,1031], [126,1029],
]
const basalContact = [
  [126,919], [200,907], [238,899], [316,908], [405,922], [517,923], [600,917],
  [705,907], [782,910], [876,913], [961,922], [1050,935], [1140,924], [1230,939],
  [1321,943], [1406,945], [1490,932], [1590,916], [1625,909],
]
const upperContact = [
  [126,316], [239,321], [315,324], [417,316], [516,330], [602,339], [692,346],
  [782,345], [875,328], [961,342], [1050,338], [1140,335], [1229,342], [1321,349],
  [1406,350], [1500,349], [1625,343],
]
const points = (ring: number[][]) => ring.map(([x, y]) => ({ x: inkaiStation(x!), z: inkaiElevation(y!) }))

function lithology(id: string, name: string, ring: number[][], rock: SectionGraphic['rock'], fine = false): SectionGraphic {
  return { id, name, type: 'lithology', points: points(ring), closed: true, reversed: false, smooth: false, rock, ...(fine && { sandGrain: 'fine' as const }) }
}

/** A distinct editable demonstration profile, reconstructed from the supplied drawing. */
export function inkaiSection(): GeologySection {
  const wellIds = inkaiWells.map(well => well.id)
  const section: GeologySection = {
    ...createSection(inkaiSectionId, 'Инкай · профиль 2364'),
    depositId: inkaiDeposit.id, depositName: inkaiDeposit.name, demoPreset: 'inkai-2364',
    stage: 'detailed', year: 2024, top: inkaiTop, bottom: inkaiBottom,
    profile: [{ x: 0, y: 0 }, { x: inkaiLength, y: 0 }],
    wellIds, segmentWells: { [`${inkaiSectionId}-v1:${inkaiSectionId}-v2`]: wellIds },
    sourceRevisions: Object.fromEntries(inkaiWells.map(well => [well.id, well.revision])),
    metadata: { depositBody: 'Участок 2 (Южный фланг)', createdOn: '', compiledBy: '', checkedBy: '' },
    description: 'Литолого-фильтрационный разрез по профилю 2364, Приложение 118. Координаты плана, фильтрационные эпюры и часть интервалов заданы тестовыми данными.',
    columnSettings: { all: {
      width: 4, offset: -5, lithology: true, intervals: true, curves: true, curveMin: 0, curveMax: 20,
      tracks: [
        { id: 'lithology', type: 'lithology', width: 4 },
        { id: 'intervals', type: 'intervals', width: 3 },
        { id: 'curve-co2', type: 'curve', curveId: 'co2', width: 8 },
        { id: 'curve-gl', type: 'curve', curveId: 'gl', width: 8 },
        { id: 'curve-kf', type: 'curve', curveId: 'kf', width: 7 },
      ],
    } },
  }
  const layers: SectionLayer[] = ['technology', 'ore', 'uncorrected', 'offbalance']
  for (const layer of layers) {
    section.participation[layer] = inkaiWells.filter(well => well[layer].length > 0).map(well => well.id)
    const anchors = layerAnchors(section, layer)
    const family = (id: string) => {
      const interval = id.split('/')[2]!
      return layer === 'ore' || layer === 'uncorrected' ? interval.split('-').slice(0, 2).join('-') : interval
    }
    for (let i = 1; i < inkaiWells.length; i++) {
      const left = anchors.filter(a => a.wellId === inkaiWells[i - 1]!.id)
      const right = anchors.filter(a => a.wellId === inkaiWells[i]!.id)
      for (const a of left) {
        const b = right.filter(candidate => family(candidate.id) === family(a.id))
          .sort((one, two) => Math.abs(one.top.z - a.top.z) - Math.abs(two.top.z - a.top.z))[0]
        if (!b || Math.abs(a.top.z - b.top.z) > 11) continue
        section.links[layer].push({ id: `INKAI-${layer}-${section.links[layer].length + 1}`, a: a.id, b: b.id })
      }
    }
  }
  const ore = layerAnchors(section, 'ore')
  section.contourEdits = { ore: ore.flatMap(anchor => {
    const region = Number(anchor.id.split('/')[2]?.split('-')[1])
    const ring = contours.ore[region]
    if (!ring) return []
    const joined = linksAtAnchor(section, 'ore', anchor, ore)
    const centreZ = (anchor.top.z + anchor.bottom.z) / 2
    const stations = ring.map(([x]) => inkaiStation(x!))
    return (['left', 'right'] as const).filter(side => !joined[side]).map(side => {
      const { min, max } = pinchBounds(section, 'ore', anchor, side)
      const target = side === 'left' ? Math.min(...stations) : Math.max(...stations)
      return { anchorId: anchor.id, side, x: Math.min(max, Math.max(min, target)), z: centreZ, boundary: false }
    })
  }) }
  const graphics: SectionGraphic[] = [
    lithology('INKAI-SAND', 'Вмещающие пески', lithologyOutline, 'sand'),
    ...contours.silt.map((ring, i) => lithology(`INKAI-FINE-${i + 1}`, `Мелкозернистая песчаная линза ${i + 1}`, ring, 'sand', true)),
    ...contours.clay.map((ring, i) => lithology(`INKAI-CLAY-${i + 1}`, `Глинистая прослойка ${i + 1}`, ring, 'clay')),
    ...contours.oxidation.map((ring, i): SectionGraphic => ({ id: `INKAI-OX-${i + 1}`, name: `Зона окисления ${i + 1}`, type: 'oxidation', points: points(ring), closed: true, reversed: false, smooth: false })),
    { id: 'INKAI-BASE', name: 'Нижняя граница толщи', type: 'foundation', points: points(basalContact), closed: false, reversed: false, smooth: true },
  ]
  // Pixel tracing can leave touching vertices. Keep only contours editable by the standard tools.
  section.graphics = graphics.filter(graphic => graphicIssues(graphic, section).length === 0)
  section.graphics.push(lithology('INKAI-UPPER', 'Верхняя граница глинистой пачки', [...upperContact, ...upperContact.slice().reverse().map(([x, y]) => [x!, y! + 1.3])], 'clay'))
  section.drawings = [{
    ...newDrawing(section, 'INKAI-DRAW-118'), name: 'Литолого-фильтрационный разрез · Приложение 118',
    horizontalScale: 2300, verticalScale: 850, planHeight: 20, appendix: '118',
    layers: ['lithology', 'ore', 'oxidation', 'foundation'], oreParameters: false,
    description: 'Месторождение Инкай · Участок 2 (Южный фланг) · профиль 2364',
  }]
  return section
}

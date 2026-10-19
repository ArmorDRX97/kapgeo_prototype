import { createSection } from './fixtures'
import { referenceWellSources, referenceLocalClay } from './referenceSources'
import type { GeologySection, SectionGraphic, SectionLayer, XZ } from './types'
import { layerAnchors, pinchBounds, stationAtDepth } from '../lib/correlation'
import { profileLength } from '../lib/profile'
import { sampleArc } from '../lib/curves'
import { newDrawing } from '../lib/drawing'

const point = ([x, z]: number[]): XZ => ({ x: x!, z: z! })
function edge(points: number[][]) {
  const sampled = sampleArc(points.map(point), true)
  return sampled.filter((_, index) => index % 4 === 0 || index === sampled.length - 1)
}
function region(id: string, name: string, rock: 'sand' | 'clay' | 'silt', points: number[][], smooth = false): SectionGraphic {
  return { id, name, type: 'lithology', rock, points: points.map(point), closed: true, smooth, reversed: false }
}
function band(id: string, name: string, rock: 'sand' | 'clay' | 'silt', upper: number[][], lower: number[][]): SectionGraphic {
  return { ...region(id, name, rock, []), points: [...edge(upper), ...edge(lower).reverse()] }
}

/** Editable, invented reconstruction of the visual motifs in the audited video. */
export function referenceSection(): GeologySection {
  const section: GeologySection = {
    ...createSection('GTR-01', 'Северный · профиль 01'), demoPreset: 'video-reference-v3',
    top: -442, bottom: -535, profile: [{ x: 0, y: 0 }, { x: 160, y: 3 }, { x: 350, y: -1 }],
    mapGeometry: {
      segments: {
        'GTR-01-v1:GTR-01-v2': [{ x: 0, y: 0 }, { x: 160, y: 0 }],
        'GTR-01-v2:GTR-01-v3': [{ x: 0, y: 100 }, { x: 190, y: 100 }],
      },
      wells: Object.fromEntries([
        [14, 4], [48, -6], [102, 7], [151, -4], [59, 103], [119, 91], [177, 105],
        [-25, 45], [35, 48], [95, 42], [155, 47], [215, 43], [30, 145], [155, 148],
      ].map(([x, y], i) => [`GTR-W${i + 1}`, { x: x!, y: y! }])),
    },
    // Fictional fixture membership keeps each segment's well list populated; runtime assignment rules are still pending.
    segmentWells: {
      'GTR-01-v1:GTR-01-v2': ['GTR-W1', 'GTR-W2', 'GTR-W3', 'GTR-W4'],
      'GTR-01-v2:GTR-01-v3': ['GTR-W5', 'GTR-W6', 'GTR-W7'],
    },
    wellIds: referenceWellSources.slice(0, 7).map(well => well.id),
    sourceRevisions: Object.fromEntries(referenceWellSources.slice(0, 7).map(well => [well.id, well.revision])),
    metadata: { geoBlock: 'ГБ-01', techBlock: 'ТБ-01', mapProfileGroup: 'north-demo', mapProfileOrder: 1, depositBody: 'Северный участок', createdOn: '2026-10-13', compiledBy: 'Демонстрационный геолог', checkedBy: '' },
    description: 'Сложное строение северного участка: разветвлённые проницаемые пласты, рудные линзы, выклинивания, внутренние исключения и границы окисления. Учебная реконструкция визуальных примеров.',
    columnSettings: { all: {
      width: 8, offset: 0, lithology: true, intervals: true, curves: true, curveMin: 0, curveMax: 160,
      tracks: [{ id: 'ref-lith', type: 'lithology', width: 8 }, { id: 'ref-interval', type: 'intervals', width: 3 }, { id: 'ref-rs', type: 'curve', curveId: 'rs', width: 26 }, { id: 'ref-gr', type: 'curve', curveId: 'gr', width: 28 }],
    } },
    auxiliary: [{ id: 'REF-AUX-T', wellId: 'GTR-W4', layer: 'technology', from: 635, to: 637 }],
  }
  section.columnSettings!['GTR-W1'] = { ...section.columnSettings!.all!, tracks: section.columnSettings!.all!.tracks!.map(track => ({ ...track, width: track.type === 'curve' ? 20 : track.width })) }
  section.columnSettings!['GTR-W7'] = { ...section.columnSettings!.all!, offset: -78 }
  for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) section.participation[layer] = [...section.wellIds]

  const connect = (layer: SectionLayer, wellA: number, tagA: string, wellB: number, tagB: string) => {
    const prefix = { technology: 'T', ore: 'O', uncorrected: 'R', offbalance: 'B' }[layer]
    const a = `${section.wellIds[wellA]}/${layer}/REF-${prefix}-${tagA}`, b = `${section.wellIds[wellB]}/${layer}/REF-${prefix}-${tagB}`
    const anchors = layerAnchors(section, layer)
    if (anchors.some(anchor => anchor.id === a) && anchors.some(anchor => anchor.id === b)) section.links[layer].push({ id: `REF-${layer}-${wellA}-${tagA}-${wellB}-${tagB}`, a, b })
  }
  for (const layer of ['technology', 'ore', 'uncorrected'] as const) {
    for (let well = 0; well < 6; well++) connect(layer, well, 'U', well + 1, 'U')
    connect(layer, 0, 'M', 1, 'M')
    connect(layer, 1, 'M', 2, 'MA'); connect(layer, 1, 'M', 2, 'MB')
    connect(layer, 2, 'MA', 3, 'MA'); connect(layer, 2, 'MB', 3, 'MB')
    connect(layer, 3, 'MA', 4, 'M'); connect(layer, 3, 'MB', 4, 'M')
    connect(layer, 4, 'M', 5, 'M'); connect(layer, 5, 'M', 6, 'M')
    connect(layer, 0, 'L', 1, 'L'); connect(layer, 1, 'L', 2, 'L')
    connect(layer, 3, 'L', 4, 'L'); connect(layer, 4, 'L', 5, 'L'); connect(layer, 5, 'L', 6, 'L')
  }
  connect('offbalance', 2, 'OB', 3, 'OB')

  const length = profileLength(section.profile)
  for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance'] as const) {
    const anchors = layerAnchors(section, layer)
    section.contourEdits = { ...section.contourEdits, [layer]: anchors.flatMap((anchor, index) => (['left', 'right'] as const).map(side => {
      const bounds = pinchBounds(section, layer, anchor, side), center = (anchor.top.z + anchor.bottom.z) / 2
      const outer = (anchor.wellId === section.wellIds[0] && side === 'left' || anchor.wellId === section.wellIds.at(-1) && side === 'right') && layer !== 'offbalance' && !anchor.id.endsWith('/REF-T-P')
      if (outer) return { anchorId: anchor.id, side, x: side === 'left' ? 0 : length, z: center, boundary: true, boundaryTop: anchor.top.z, boundaryBottom: anchor.bottom.z }
      const fraction = .24 + (index % 4) * .12, station = side === 'left' ? Math.min(anchor.top.x, anchor.bottom.x) : Math.max(anchor.top.x, anchor.bottom.x)
      return { anchorId: anchor.id, side, x: station + ((side === 'left' ? bounds.min : bounds.max) - station) * fraction, z: center + Math.sin(index * 1.7) * Math.min(1, (anchor.top.z - anchor.bottom.z) / 5), boundary: false }
    })) }
    section.arcEdits = { ...section.arcEdits, [layer]: section.links[layer].flatMap((link, index) => {
      const a = anchors.find(anchor => anchor.id === link.a)!, b = anchors.find(anchor => anchor.id === link.b)!
      return (['top', 'bottom'] as const).map(boundary => ({ linkId: link.id, edge: boundary, smooth: true, points: [.24, .52, .78].map((fraction, n) => ({
        x: a[boundary].x + (b[boundary].x - a[boundary].x) * fraction,
        z: a[boundary].z + (b[boundary].z - a[boundary].z) * fraction + Math.sin(index * .8 + n * 1.5) * (layer === 'offbalance' ? .18 : boundary === 'top' ? .65 : .45),
      })) }))
    }) }
  }

  section.graphics = [
    region('REF-SAND', 'Песчаная вмещающая толща', 'sand', [[0,-442],[length,-442],[length,-535],[0,-535]]),
    band('REF-CLAY-ROOF', 'Глинистый покров с эрозионными окнами', 'clay', [[0,-442],[50,-442],[105,-442],[160,-442],[220,-442],[280,-442],[length,-442]], [[0,-451],[14,-453],[48,-463],[102,-456],[151,-460],[219,-455],[279,-461],[length,-458]]),
    { ...region('REF-ROOF-WINDOW', 'Песчаное окно в покрове', 'sand', [[88,-445],[93,-444],[98,-447],[97,-452],[94,-454],[90,-451]], true), parentId: 'REF-CLAY-ROOF' },
    band('REF-SILT-TONGUE', 'Алевритовый клин западного фланга', 'silt', [[0,-463],[20,-464],[48,-466],[80,-465],[115,-469]], [[0,-476],[20,-474],[48,-470],[80,-468],[115,-469.3]]),
    band('REF-CLAY-MIDDLE', 'Наклонная глинистая прослойка', 'clay', [[0,-477],[35,-478.2],[70,-476.5],[110,-480],[151,-482],[200,-480.5],[250,-483],[300,-486],[length,-485]], [[0,-480.5],[35,-481.5],[70,-479],[110,-482.5],[151,-485],[200,-483.2],[250,-486],[300,-488],[length,-488]]),
    region('REF-CLAY-LENS', 'Локальная глинистая линза', 'clay', [[168,-467.8],[181,-466.8],[196,-468.2],[189,-470.4],[176,-470.7],[164,-469.4]], true),
    region('REF-SILT-LENS', 'Алевритовая линза восточного фланга', 'silt', [[236,-494],[253,-491.8],[277,-493.2],[288,-496],[267,-498.1],[246,-497.4]], true),
    band('REF-CLAY-LOWER', 'Нижняя волнистая глинистая пачка', 'clay', [[0,-502],[48,-503],[102,-500.8],[151,-505.5],[202,-506.5],[252,-504.8],[300,-506],[length,-507]], [[0,-506],[48,-507],[102,-505],[151,-511.5],[202,-512],[252,-510],[300,-512],[length,-514]]),
    { ...region('REF-LOWER-HOLE', 'Песчаная линза внутри глинистой пачки', 'sand', [[157,-507.5],[171,-507.2],[190,-508.1],[193,-509.3],[176,-510.2],[161,-509.7]], true), parentId: 'REF-CLAY-LOWER' },
    band('REF-BASAL-CLAY', 'Глинистая подошва разреза', 'clay', [[0,-528],[45,-526],[100,-531],[145,-524],[210,-529],[275,-525.5],[length,-531]], [[0,-535],[50,-535],[110,-535],[170,-535],[230,-535],[290,-535],[length,-535]]),
    { id: 'REF-OX-UPPER', name: 'Верхняя граница окисления', type: 'oxidation', closed: false, reversed: false, smooth: true, points: [[0,-477.5],[34,-476],[70,-473],[112,-478],[155,-480.5],[199,-479],[243,-483],[295,-486],[length,-484]].map(point) },
    { id: 'REF-OX-POCKET', name: 'Замкнутая область окисления', type: 'oxidation', closed: true, reversed: true, smooth: true, points: [[27,-490],[57,-487],[94,-490],[125,-493],[168,-490],[196,-494],[213,-503],[188,-514],[150,-516],[122,-510],[90,-514],[56,-508],[37,-500]].map(point) },
    { id: 'REF-OX-LOWER', name: 'Нижняя граница окисления', type: 'oxidation', closed: false, reversed: true, smooth: true, points: [[0,-516],[46,-517],[92,-513],[132,-518],[176,-521],[224,-517],[270,-522],[315,-520],[length,-523]].map(point) },
    { id: 'REF-FOUNDATION', name: 'Поверхность фундамента', type: 'foundation', closed: false, reversed: false, smooth: true, points: [[0,-528],[45,-526],[100,-531],[145,-524],[210,-529],[275,-525.5],[length,-531]].map(point) },
    { id: 'REF-FAULT-WEST', name: 'Западный наклонный разлом', type: 'fault', closed: false, reversed: false, smooth: false, points: [[128,-442],[138,-471],[153,-499],[169,-535]].map(point) },
    { id: 'REF-FAULT-EAST', name: 'Восточный локальный разлом', type: 'fault', closed: false, reversed: false, smooth: false, points: [[247,-466],[260,-492],[278,-530]].map(point) },
  ]
  section.graphics.push(...referenceWellSources.slice(0,referenceLocalClay.length).flatMap((well,index)=>referenceLocalClay[index]!.map(([id,top,bottom],n)=>{
    const x=stationAtDepth(section,well,well.collar.z-(top+bottom)/2).x
    const left=Math.max(1,x-(4+index%3*3+n*2)),right=Math.min(length-1,x+(7+(index+n)%4*3))
    return region(`REF-LOCAL-${index}-${id}`,`Глинистая прослойка ${well.name} · ${n+1}`,'clay',[[left,(top+bottom)/2],[x,top],[x+(right-x)*.55,top-.08],[right,(top+bottom)/2-.12],[x,bottom],[x-(x-left)*.4,bottom+.08]],true)
  })))
  const first = newDrawing(section, 'REF-DRAW-LITH')
  section.drawings = [
    { ...first, name: 'Литологический разрез', horizontalScale: 1500, verticalScale: 600, layers: ['lithology', 'foundation', 'fault'], description: 'Литологические области, внутренние линзы, план профиля и скважинные колонки.' },
    { ...first, id: 'REF-DRAW-TECH', name: 'Геотехнологическое строение', landscape: false, horizontalScale: 1500, verticalScale: 500, layers: ['technology', 'ore', 'offbalance', 'oxidation', 'foundation', 'fault'], description: 'Связные пласты, рудные пересечения, технологический забаланс и линии окисления.' },
  ]
  return section
}

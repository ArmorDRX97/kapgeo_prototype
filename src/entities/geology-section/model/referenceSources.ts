import { bendReferenceWell } from './referenceTrace'
import type { SectionInterval, SectionWellSource } from './types'

// Invented sources in the coordinate/depth range seen in the reference video.
// No production borehole names, database identifiers or original measurements.
type Zone = [id: string, top: number, bottom: number]
const stations = [14, 48, 102, 151, 219, 279, 337]
const collars = [130, 129, 131, 130, 132, 131, 129]
const depths = [654, 659, 651, 664, 657, 661, 654]
const offsets = [4, -6, 7, -4, 3, -9, 5]
const drifts = [-1, 1, -2, .5, -1.5, 2, -1]

const technology: Zone[][] = [
  [['U', -449, -469], ['M', -478, -487], ['L', -509, -515], ['P', -496, -497.5]],
  [['U', -452, -468], ['M', -480, -490], ['L', -507, -513], ['P', -498, -499.5]],
  [['U', -447, -465], ['MA', -477, -484], ['MB', -490, -498], ['L', -513, -519]],
  [['U', -450, -466], ['MA', -479, -486], ['MB', -493, -501], ['L', -514, -520]],
  [['U', -455, -473], ['M', -482, -503], ['L', -512, -519], ['P', -476, -477]],
  [['U', -451, -470], ['M', -487, -506], ['L', -517, -522], ['P', -480, -481.2]],
  [['U', -453, -471], ['M', -490, -511], ['L', -516, -523], ['P', -480, -483]],
]
const ore: Zone[][] = [
  [['M', -479, -485], ['L', -511, -513.5]],
  [['U', -459, -464], ['M', -482, -488], ['L', -509, -512]],
  [['U', -454, -460], ['MA', -478, -482], ['MB', -492, -496], ['L', -515, -517.8]],
  [['U', -456, -462], ['MA', -480, -484], ['MB', -496, -500], ['L', -516, -519]],
  [['U', -466, -472], ['M', -485, -500], ['L', -514, -517]],
  [['U', -463, -470], ['M', -491, -504], ['L', -519, -521]],
  [['U', -464, -468], ['M', -494, -508], ['L', -519, -522]],
]
const offbalance: Zone[][] = [
  [['OB', -500, -503]], [], [['OB', -485.8, -488.2]],
  [['OB', -486.6, -489.4]], [['OB', -478, -480]],
  [['OB', -508.8, -511.2]], [['OB', -484.5, -487.2]],
]
export const referenceLocalClay: Zone[][] = [
  [['C1',-489.6,-490.1],['C2',-498.8,-499.5]], [['C1',-474.2,-475.1],['C2',-495,-495.8]],
  [['C1',-470.4,-471.2],['C2',-487.8,-488.4]], [['C1',-472.5,-473.1],['C2',-501.7,-502.6]],
  [['C1',-475.2,-475.9],['C2',-496,-497]], [['C1',-479.1,-479.7],['C2',-502.7,-503.2]],
  [['C1',-472.4,-473.8],['C2',-499.5,-500.2]],
]
const roof = [-453,-463,-456,-460,-455,-461,-458]
const middleTop = [-477.8,-477.5,-479.5,-482,-481.5,-485,-485]
const middleBottom = [-481,-480.6,-482.5,-485,-484,-488,-488]
const lowerTop = [-502.2,-503,-500.8,-505.5,-506.5,-505.7,-506.8]
const lowerBottom = [-506.2,-507,-505,-511.5,-512,-511,-513.5]
const basement = [-527,-526,-531,-524,-529,-525.5,-531]

function intervals(zones: Zone[], collarZ: number, prefix: string, kind: SectionInterval['kind'] = 'permeable'): SectionInterval[] {
  return zones.map(([id, top, bottom]) => ({ id: `${prefix}-${id}`, from: collarZ - top, to: collarZ - bottom, kind }))
}
function noise(index: number, well: number) {
  const value = Math.sin(index * 127.1 + well * 311.7) * 43758.5453
  return (value - Math.floor(value)) * 2 - 1
}

const primaryReferenceWellSources: SectionWellSource[] = stations.map((x, index) => {
  const z = collars[index]!, depth = depths[index]!, y = offsets[index]!, dx = drifts[index]!
  const zones = technology[index]!, oreZones = ore[index]!
  const materialBands = [
    { top:-440, bottom:roof[index]!, rock:'clay' as const },
    { top:middleTop[index]!, bottom:middleBottom[index]!, rock:'clay' as const },
    { top:lowerTop[index]!, bottom:lowerBottom[index]!, rock:'clay' as const },
    { top:basement[index]!, bottom:z-depth, rock:'clay' as const },
    ...referenceLocalClay[index]!.map(([,top,bottom])=>({top,bottom,rock:'clay' as const})),
    ...(index<3 ? [{top:[-464,-466,-468.5][index]!,bottom:[-474.5,-470,-469.3][index]!,rock:'silt' as const}] : index===5 ? [{top:-493.5,bottom:-497.4,rock:'silt' as const}] : []),
  ]
  const boundaries = [...new Set([-440,z-depth,...materialBands.flatMap(band=>[band.top,band.bottom])])]
    .filter(value=>value>=z-depth&&value<=-440).sort((a,b)=>b-a)
  const lithology: SectionWellSource['lithology'] = boundaries.slice(1).map((bottom, n) => ({
    id: `REF-L-${index}-${n}`, from: z - boundaries[n]!, to: z - bottom,
    rock: materialBands.find(band=> (boundaries[n]!+bottom)/2<=band.top&&(boundaries[n]!+bottom)/2>=band.bottom)?.rock??'sand',
  }))
  const curves = (['rs', 'gr'] as const).map((id, curveIndex) => ({
    id, name: id === 'rs' ? 'КС' : 'ГК', unit: id === 'rs' ? 'Ом·м' : 'мкР/ч', min: 0, max: id === 'rs' ? 160 : 180,
    samples: Array.from({ length: Math.floor((depth - 570) / .25) + 1 }, (_, n) => {
      const md = 570 + n * .25, height = z - md
      const peaks = oreZones.reduce((sum, [, top, bottom]) => {
        const center = (top + bottom) / 2, spread = Math.max(.45, (top - bottom) / 3)
        return sum + Math.exp(-(((height - center) / spread) ** 2)) * (curveIndex ? 84 : 44)
      }, 0)
      const drift = 10 * Math.sin(md * .17 + index * .8) + 6 * Math.sin(md * .81 + curveIndex)
      const value = Math.max(1, Math.min(curveIndex ? 178 : 158, 22 + index * 2 + peaks + drift + noise(n, index + curveIndex * 13) * (curveIndex ? 9 : 4)))
      return { md, value: index === 3 && curveIndex === 1 && height < -500 && height > -501.5 ? null : Math.round(value * 10) / 10 }
    }),
  }))
  return {
    id: `GTR-W${index + 1}`, name: `ГС-${101 + index}`, collar: { x, y, z }, depth, revision: 1,
    trajectory: [{ md: 0, x, y, z }, { md: depth * .6, x: x + dx * .35, y: y + 1, z: z - depth * .6 }, { md: depth, x: x + dx, y: y + 2, z: z - depth }],
    technology: intervals(zones, z, 'REF-T'), ore: intervals(oreZones, z, 'REF-O'),
    uncorrected: intervals(oreZones.map(([id, top, bottom]) => [id, top + 1.1 + index % 2 * .4, Math.max(z - depth, bottom - 1.2)] as Zone), z, 'REF-R'),
    offbalance: intervals(offbalance[index]!, z, 'REF-B', 'impermeable'), lithology, curves,
  }
})

// Parallel-row wells are separate invented map fixtures. Existing seven
// source coordinates stay fixed so saved section geometry remains valid.
const parallelStations = [12, 68, 124, 180, 236, 292, 338]
const parallelReferenceWellSources = primaryReferenceWellSources.map((well, index): SectionWellSource => {
  const suffix = '-P'
  const dx = parallelStations[index]! - well.collar.x
  return {
    ...well,
    id: `GTR-W${index + 8}`,
    name: `ГС-${index + 108}`,
    collar: { ...well.collar, x: parallelStations[index]!, y: well.collar.y + 75 },
    trajectory: well.trajectory.map(point => ({ ...point, x: point.x + dx, y: point.y + 75 })),
    technology: well.technology.map(interval => ({ ...interval, id: `${interval.id}${suffix}` })),
    ore: well.ore.map(interval => ({ ...interval, id: `${interval.id}${suffix}` })),
    uncorrected: well.uncorrected.map(interval => ({ ...interval, id: `${interval.id}${suffix}` })),
    offbalance: well.offbalance.map(interval => ({ ...interval, id: `${interval.id}${suffix}` })),
    lithology: well.lithology.map(interval => ({ ...interval, id: `${interval.id}${suffix}` })),
    curves: well.curves.map(curve => ({ ...curve, samples: curve.samples.map(sample => ({ ...sample, value: sample.value === null ? null : Math.max(0, sample.value + (index % 3 - 1) * 2) })) })),
  }
})
export const referenceWellSources = [...primaryReferenceWellSources, ...parallelReferenceWellSources]

export const bentReferenceWellSources = referenceWellSources.map(bendReferenceWell)

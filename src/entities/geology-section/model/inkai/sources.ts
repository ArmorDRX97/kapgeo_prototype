import type { SectionInterval, SectionWellSource } from '../types'
import contours from './contours.json'

export const inkaiDeposit = { id: 'GTR-LOCAL-INKAI', name: 'Инкай' } as const
export const inkaiSectionId = 'GTR-118'

const left = 126, right = 1625, chartTop = 102, metresPerPixelZ = 20 / 179.6
export const inkaiLength = (right - left) * metresPerPixelZ * 5
export const inkaiTop = -100, inkaiBottom = -212
export const inkaiStation = (x: number) => (x - left) * metresPerPixelZ * 5
export const inkaiElevation = (y: number) => inkaiTop - (y - chartTop) * metresPerPixelZ

const collars = [
  ['3017', 149, 1031, 685], ['2846', 239, 1045, 528],
  ['3018', 315, 1102, 665], ['2847', 417, 1054, 616],
  ['3019', 516, 1050, 597], ['2848', 602, 1043, 581],
  ['2849', 692, 1016, 622], ['2850', 782, 980, 655],
  ['21132', 875, 1020, 570], ['21150', 961, 1056, 549],
  ['21277', 1050, 1018, 559], ['21295', 1140, 1010, 675],
  ['21316', 1229, 1072, 735], ['21342', 1321, 1057, 525],
  ['21375', 1406, 1058, 524], ['21459', 1590, 960, 506],
] as const

function spans(ring: number[][], x: number): Array<[number, number]> {
  const crossings = ring.flatMap(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % ring.length]!
    return (ax! > x) === (bx! > x) ? [] : [ay! + (by! - ay!) * (x - ax!) / (bx! - ax!)]
  }).sort((a, b) => a - b)
  const intervals: Array<[number, number]> = []
  for (let i = 0; i + 1 < crossings.length; i += 2) intervals.push([crossings[i]!, crossings[i + 1]!])
  return intervals
}

const curveKinds = [
  { id: 'kf', name: 'Кф', unit: 'м/сут', min: 0, max: 20 },
  { id: 'gl', name: 'Глинистость', unit: '%', min: 0, max: 40 },
  { id: 'co2', name: 'Карбонатность', unit: '%', min: 0, max: 2 },
] as const

export const inkaiWells: SectionWellSource[] = collars.map(([name, x, end, logStart], index) => {
  const id = `INKAI-${name}`, elevation = 135 + Math.round(4 * Math.sin(index * .64))
  const md = (y: number) => Number((elevation - inkaiElevation(y)).toFixed(3))
  const depth = md(end), station = inkaiStation(x)
  const collar = { x: station, y: 7 * Math.sin(index * 1.2), z: elevation }
  const interval = (tag: string, from: number, to: number, kind: SectionInterval['kind'] = 'permeable') =>
    ({ id: tag, from: md(from), to: md(to), kind })
  const change = 12 * Math.sin(index * .55) + 5 * Math.cos(index * 1.7)
  const technology = [
    interval('T-upper', 592 - index * 3 + change, 683 - index * 1.6 + change),
    interval('T-middle', 695 + change, 809 + change * .5),
    interval('T-lower', 826 + change * .75, 927 + change * .55),
  ]
  const ore = contours.ore.flatMap((ring, region) => spans(ring, x + .35).flatMap(([a, b], n) => {
    if (b - a < 1.55 || b >= end) return []
    return [{ ...interval(`O-${region}-${n}`, a, b), grade: Number((.013 + ((region * 11 + index * 7) % 42) / 1000).toFixed(3)) }]
  }))
  const uncorrected = ore.map(({ from, to, ...entry }) => ({ ...entry, from: Math.max(0, from - .12), to: Math.min(depth, to + .12) }))
  const offbalance = [
    ...(index >= 1 && index <= 5 ? [interval('B-west', 711 + change * .25, 717 + change * .25, 'impermeable')] : []),
    ...(index >= 8 && index <= 13 ? [interval('B-east', 781 - (index - 8) * 3, 789 - (index - 8) * 3, 'impermeable')] : []),
  ]
  const clay = contours.clay.flatMap(ring => spans(ring, x + .35)), silt = contours.silt.flatMap(ring => spans(ring, x + .35))
  const boundaries = [...new Set([chartTop, end, ...[...clay, ...silt].flat()])].filter(y => y >= chartTop && y <= end).sort((a, b) => a - b)
  const lithology: SectionWellSource['lithology'] = [{ id: 'L-roof', from: 0, to: md(chartTop), rock: 'sand' }]
  for (let i = 1; i < boundaries.length; i++) {
    const from = boundaries[i - 1]!, to = boundaries[i]!, mid = (from + to) / 2
    if (md(to) <= md(from)) continue
    const inside = ([a, b]: [number, number]) => mid > a && mid < b
    const rock = clay.some(inside) ? 'clay' : 'sand'
    const sandGrain = rock === 'sand' && silt.some(inside) ? 'fine' as const : undefined
    const previous = lithology.at(-1)!
    if (previous.rock === rock && previous.sandGrain === sandGrain) previous.to = md(to)
    else lithology.push({ id: `L-${i}`, from: md(from), to: md(to), rock, sandGrain })
  }
  const samples = Array.from({ length: Math.floor((end - logStart) / 12) }, (_, i) => logStart + i * 12)
  const curves = curveKinds.map((kind, k) => ({
    ...kind, samples: samples.flatMap((y, i) => {
      const value = kind.max * (.19 + ((i * (7 + k) + index * 11 + (i % 4) ** 2) % 16) / 23)
      return [{ md: md(y), value }, { md: md(y + 12), value }]
    }),
  }))
  return { id, name, collar, depth, revision: 1, trajectory: [{ ...collar, md: 0 }, { x: station, y: collar.y + 3 * Math.sin(index), z: inkaiElevation(end), md: depth }], lithology, technology, ore, uncorrected, offbalance, curves }
})

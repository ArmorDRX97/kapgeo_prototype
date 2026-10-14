import { ticks } from './geometry'
import type { MapGrid } from './model'

export function mapGridTicks(min: number, max: number, automaticSpacing: number, grid: MapGrid, axis: 'x'|'y') {
  const offset = axis === 'x' ? grid.dx : grid.dy
  if (!grid.step) return ticks(min-offset,max-offset,automaticSpacing).map(t => t+offset)
  const step = Math.max(grid.step, (max-min)/500), first = Math.ceil((min-offset)/step)
  return Array.from({ length: Math.max(0,Math.min(501,Math.floor((max-offset)/step)-first+1)) },(_,i) => (first+i)*step+offset)
}

/** Keep every grid line, but thin labels in screen or paper units independently. */
export function gridLabelTicks(values:number[], unitsPerMeter:number, minimumGap:number) {
  const gap=values.length>1?Math.abs(values[1]!-values[0]!)*unitsPerMeter:minimumGap
  const stride=Math.max(1,Math.ceil(minimumGap/Math.max(.001,gap)))
  return values.filter((_,index)=>index%stride===0)
}
export function gridLabel(value:number,values:number[]) {
  const step=values.length>1?Math.abs(values[1]!-values[0]!):1
  return value.toFixed(Math.max(0,Math.min(3,Math.ceil(-Math.log10(step)))))
}

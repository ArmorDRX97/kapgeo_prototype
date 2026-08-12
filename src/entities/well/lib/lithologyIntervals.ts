import type { GeologicalInterval } from '../model/types'

export function splitLithologyInterval(interval: GeologicalInterval, at: number): [GeologicalInterval, GeologicalInterval] | undefined {
  if (at <= interval.from || at >= interval.to) return undefined

  return [
    { ...interval, id: `${interval.id}-a`, to: at },
    { ...interval, id: `${interval.id}-b`, from: at },
  ]
}

export function mergeLithologyIntervals(first: GeologicalInterval, second: GeologicalInterval): GeologicalInterval | undefined {
  if (Math.abs(first.to - second.from) > 0.001) return undefined

  return {
    ...first,
    id: `${first.id}-merged`,
    to: second.to,
    description: `${first.description} ${second.description}`.trim(),
  }
}

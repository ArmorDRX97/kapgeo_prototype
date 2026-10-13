import type { DepthInterval, MeasurementRecord } from '../model/alphaTypes'
export const rounded = (n: number, digits = 3) => Number(n.toFixed(digits))
export function assertDepth(from: number, to: number, depth: number) {
  if (![from, to].every(Number.isFinite) || from < 0 || to > depth || to - from < 0.05) throw new Error(`Задайте интервал внутри 0…${depth} м, кровля меньше подошвы.`)
}
export function valueAt(record: MeasurementRecord, d: number): number | null {
  if (d < record.depths[0]! || d > record.depths.at(-1)!) return null
  let lo = 0, hi = record.depths.length - 1
  while (lo + 1 < hi) { const mid = Math.floor((lo + hi) / 2); if (record.depths[mid]! <= d) lo = mid; else hi = mid }
  if (record.depths[lo] === d) return record.values[lo] ?? null
  if (record.depths[hi] === d) return record.values[hi] ?? null
  const a = record.values[lo], b = record.values[hi]
  return a == null || b == null ? null : a + (b - a) * (d - record.depths[lo]!) / (record.depths[hi]! - record.depths[lo]!)
}
export function integrate(record: MeasurementRecord, from: number, to: number, transform: (v: number) => number = v => v) {
  let area = 0, covered = 0, minimum = Infinity
  for (let i = 0; i < record.depths.length - 1; i++) {
    const a = Math.max(from, record.depths[i]!), b = Math.min(to, record.depths[i + 1]!)
    if (b <= a) continue
    const av = valueAt(record, a), bv = valueAt(record, b)
    if (av === null || bv === null) continue
    const x = transform(av), y = transform(bv); area += (x + y) / 2 * (b - a); covered += b - a; minimum = Math.min(minimum, x, y)
  }
  return { area: covered ? area : null, mean: covered ? area / covered : null, covered, minimum: Number.isFinite(minimum) ? minimum : null }
}
/** No segment crosses a missing sample; contacts are linearly interpolated. */
export function thresholdIntervals(record: MeasurementRecord, from: number, to: number, threshold: number, transform: (v: number, d: number) => number = v => v): DepthInterval[] {
  const spans: DepthInterval[] = []
  const append = (a: number, b: number) => { if (b - a < 0.00001) return; const last = spans.at(-1); if (last && Math.abs(last.to - a) < 0.00001) last.to = b; else spans.push({ id: `span-${spans.length}`, from: a, to: b }) }
  for (let i = 0; i < record.depths.length - 1; i++) {
    const a = Math.max(from, record.depths[i]!), b = Math.min(to, record.depths[i + 1]!); if (b <= a) continue
    const av = valueAt(record, a), bv = valueAt(record, b); if (av === null || bv === null) continue
    const x = transform(av, a), y = transform(bv, b)
    if (x >= threshold && y >= threshold) append(a, b)
    else if ((x >= threshold) !== (y >= threshold)) { const c = a + (threshold - x) / (y - x) * (b - a); append(x >= threshold ? a : c, x >= threshold ? c : b) }
  }
  return spans.map((s, i) => ({ id: `span-${i}`, from: rounded(s.from), to: rounded(s.to) })).filter(s => s.to > s.from)
}
export const overlap = (a: { from: number; to: number }, b: { from: number; to: number }) => Math.max(0, Math.min(a.to, b.to) - Math.max(a.from, b.from))

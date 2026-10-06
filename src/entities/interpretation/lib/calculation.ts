import type { CalculationParameters, InterpretationWell, TechnologyInterval } from '../model/types'

type Point = { depth: number; value: number }
export const roundDepth = (value: number, step = 0.1) => Number((Math.round(value / step) * step).toFixed(6))
const finite = (p: Point | undefined): p is Point => !!p && Number.isFinite(p.value) && p.value > 0
const interpolate = (a: Point, b: Point, depth: number) => a.value + (b.value - a.value) * (depth - a.depth) / (b.depth - a.depth)
export function calculateTechnology(well: InterpretationWell, params: CalculationParameters): TechnologyInterval[] {
  const step = params.rounding ?? 0.1, reverse = params.direction === 'up'
  if (!Number.isFinite(params.from) || !Number.isFinite(params.to) || params.from < 0 || params.to > well.depth || params.to - params.from < 0.099) throw new Error('Укажите корректный диапазон расчёта внутри скважины.')
  if (!(params.threshold > 0) || !Number.isFinite(params.threshold) || ![0.1, 0.2, 0.5, 1].includes(step) || [params.minThickness, params.minImpermeable ?? params.minThickness].some(v => !Number.isFinite(v) || v < 0)) throw new Error('Проверьте порог, округление и минимальные мощности.')
  const curve = well.curves.find(c => c.id === params.curveId && c.type === 'RS')
  if (!curve) throw new Error('Выберите доступную кривую КС.')
  const points: Point[] = Array.from(curve.data.depths).map((depth, i) => ({ depth, value: curve.data.values[i] ?? Number.NaN }))
  const rows: TechnologyInterval[] = []
  const append = (from: number, to: number, kind: TechnologyInterval['kind'], extend = false) => {
    from = Math.max(extend ? 0 : params.from, Math.min(roundDepth(from, step), extend ? well.depth : params.to))
    to = Math.max(extend ? 0 : params.from, Math.min(roundDepth(to, step), extend ? well.depth : params.to))
    if (to - from < 0.099) return
    const last = rows.at(-1)
    if (last?.kind === kind && Math.abs(last.to - from) < 0.001) last.to = to
    else rows.push({ id: `calc-${rows.length}`, from, to, kind, source: 'calculation' })
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!
    const from = Math.max(params.from, a.depth), to = Math.min(params.to, b.depth)
    if (to <= from) continue
    if (!finite(a) || !finite(b)) { append(from, to, 'unknown'); continue }
    if (params.method !== 'gradient') {
      const av = interpolate(a, b, from), bv = interpolate(a, b, to)
      const first = av >= params.threshold ? 'permeable' : 'impermeable', second = bv >= params.threshold ? 'permeable' : 'impermeable'
      if (first === second) append(from, to, first)
      else { const contact = from + (params.threshold - av) / (bv - av) * (to - from); append(from, contact, first); append(contact, to, second) }
    } else append(from, to, 'permeable') // Valid spans are subdivided at extrema below.
  }
  if (!rows.length || rows.every(row => row.kind === 'unknown')) throw new Error('В выбранном диапазоне нет пригодных точек КС.')
  let result = rows
  if (params.method === 'gradient') {
    result = []
    for (const span of rows) {
      if (span.kind === 'unknown') { result.push(span); continue }
      const firstCell = points.findIndex((p, i) => p.depth <= (reverse ? span.to : span.from) && (points[i + 1]?.depth ?? -1) >= (reverse ? span.to : span.from))
      const a = points[firstCell], b = points[firstCell + 1]
      let kind: TechnologyInterval['kind'] = a && b && interpolate(a, b, reverse ? span.to : span.from) >= params.threshold ? 'permeable' : 'impermeable'
      const extrema = points.flatMap<{ depth: number; kind: TechnologyInterval['kind'] }>((p, i) => {
        const before = points[i - 1], after = points[i + 1]
        if (!finite(before) || !finite(p) || !finite(after) || p.depth <= span.from || p.depth >= span.to) return []
        // Plateaus: the last flat point before a strict rise/fall is the deterministic contact.
        if (p.value <= before.value && p.value < after.value && p.value < params.threshold) return [{ depth: p.depth, kind: 'permeable' as const }]
        if (p.value >= before.value && p.value > after.value && p.value >= params.threshold) return [{ depth: p.depth, kind: 'impermeable' as const }]
        return []
      }).sort((x, y) => reverse ? y.depth - x.depth : x.depth - y.depth)
      let cursor = reverse ? span.to : span.from
      for (const event of extrema) {
        const contact = Math.max(span.from, Math.min(span.to, roundDepth(event.depth, step)))
        if (event.kind === kind) continue
        if (Math.abs(contact - cursor) >= 0.099) result.push({ ...span, from: Math.min(cursor, contact), to: Math.max(cursor, contact), kind })
        cursor = contact; kind = event.kind
      }
      const end = reverse ? span.from : span.to
      if (Math.abs(end - cursor) >= 0.099) result.push({ ...span, from: Math.min(cursor, end), to: Math.max(cursor, end), kind })
    }
    result.sort((a, b) => a.from - b.from)
    if (params.continuePermeable) {
      const last = reverse ? result[0] : result.at(-1)
      if (last?.kind === 'permeable') {
        const indices = points.map((_, i) => i).filter(i => reverse ? points[i]!.depth < params.from : points[i]!.depth > params.to)
        if (reverse) indices.reverse()
        for (const i of indices) {
          const p = points[i]!, before = points[i - 1], after = points[i + 1]
          if (!finite(p) || !finite(before) || !finite(after)) break
          if (p.value <= before.value && p.value < after.value && p.value < params.threshold) {
            if (reverse) last.from = roundDepth(p.depth, step); else last.to = roundDepth(p.depth, step)
            break
          }
        }
      }
    }
  }
  const filtered: TechnologyInterval[] = []
  for (const row of reverse ? [...result].reverse() : result) {
    const last = filtered.at(-1)
    const thin = row.to - row.from < (row.kind === 'impermeable' ? params.minImpermeable ?? params.minThickness : params.minThickness)
    if (last && (reverse ? Math.abs(row.to - last.from) : Math.abs(row.from - last.to)) < 0.001 && (last.kind === row.kind || (thin && last.kind !== 'unknown' && row.kind !== 'unknown'))) {
      last.from = Math.min(last.from, row.from); last.to = Math.max(last.to, row.to)
    } else filtered.push({ ...row })
  }
  return filtered.sort((a, b) => a.from - b.from).map((r, i) => ({ ...r, id: `calc-${i}` }))
}

/** Trapezoidal depth-weighted mean of finite positive RS cells, without bridging gaps. */
export function meanResistivity(well: InterpretationWell, from: number, to: number, curveId = 'rs-main') {
  const curve = well.curves.find(c => c.id === curveId && c.type === 'RS')
  let integral = 0, covered = 0
  if (curve && to > from) for (let i = 0; i < curve.data.depths.length - 1; i++) {
    const a = { depth: curve.data.depths[i]!, value: curve.data.values[i] ?? Number.NaN }, b = { depth: curve.data.depths[i + 1]!, value: curve.data.values[i + 1] ?? Number.NaN }
    const start = Math.max(from, a.depth), end = Math.min(to, b.depth)
    if (end <= start || !finite(a) || !finite(b)) continue
    integral += (interpolate(a, b, start) + interpolate(a, b, end)) / 2 * (end - start); covered += end - start
  }
  return { mean: covered > 0 ? integral / covered : undefined, coverage: to > from ? covered / (to - from) : 0 }
}

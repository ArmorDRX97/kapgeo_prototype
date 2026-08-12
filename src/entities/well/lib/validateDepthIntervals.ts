export type DepthInterval = { id: string; from: number; to: number }

export type IntervalIssue = {
  severity: 'error' | 'warning'
  code: 'invalid-range' | 'outside-depth' | 'overlap' | 'gap'
  intervalId?: string
  message: string
}

export function validateDepthIntervals(intervals: DepthInterval[], totalDepth: number, requireCoverage = false): IntervalIssue[] {
  const issues: IntervalIssue[] = []
  const sorted = [...intervals].sort((a, b) => a.from - b.from)

  sorted.forEach((interval) => {
    if (!Number.isFinite(interval.from) || !Number.isFinite(interval.to) || interval.from >= interval.to) {
      issues.push({ severity: 'error', code: 'invalid-range', intervalId: interval.id, message: `Интервал ${interval.from}–${interval.to} м: начало должно быть меньше окончания.` })
    }
    if (interval.from < 0 || interval.to > totalDepth) {
      issues.push({ severity: 'error', code: 'outside-depth', intervalId: interval.id, message: `Интервал ${interval.from}–${interval.to} м выходит за глубину скважины ${totalDepth} м.` })
    }
  })

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!
    const current = sorted[index]!
    if (current.from < previous.to) {
      issues.push({ severity: 'error', code: 'overlap', intervalId: current.id, message: `Перекрытие ${previous.to - current.from} м между интервалами ${previous.from}–${previous.to} и ${current.from}–${current.to} м.` })
    } else if (requireCoverage && current.from > previous.to) {
      issues.push({ severity: 'warning', code: 'gap', intervalId: current.id, message: `Неописанный интервал ${previous.to}–${current.from} м.` })
    }
  }

  if (requireCoverage && sorted.length > 0) {
    if (sorted[0]!.from > 0) issues.push({ severity: 'warning', code: 'gap', intervalId: sorted[0]!.id, message: `Неописанный интервал 0–${sorted[0]!.from} м.` })
    if (sorted.at(-1)!.to < totalDepth) issues.push({ severity: 'warning', code: 'gap', intervalId: sorted.at(-1)!.id, message: `Неописанный интервал ${sorted.at(-1)!.to}–${totalDepth} м.` })
  }

  return issues
}

export function calculateRecovery(from: number, to: number, recovered: number) {
  const length = to - from
  return length > 0 ? Math.max(0, Math.min(100, recovered / length * 100)) : 0
}

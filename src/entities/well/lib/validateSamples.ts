import type { Sample } from '../model/types'

export type SampleIssue = { sampleId: string; message: string }

export function validateSamples(samples: Sample[], totalDepth: number): SampleIssue[] {
  const issues: SampleIssue[] = []
  const numbers = new Set<string>()
  samples.forEach((sample) => {
    const key = sample.number.trim().toLocaleUpperCase()
    if (!key) issues.push({ sampleId: sample.id, message: 'Укажите номер пробы.' })
    else if (numbers.has(key)) issues.push({ sampleId: sample.id, message: `Номер пробы ${sample.number} уже используется в этой скважине.` })
    else numbers.add(key)
    if (!Number.isFinite(sample.from) || !Number.isFinite(sample.to) || sample.from >= sample.to) issues.push({ sampleId: sample.id, message: `Проба ${sample.number}: начало интервала должно быть меньше окончания.` })
    else if (sample.from < 0 || sample.to > totalDepth) issues.push({ sampleId: sample.id, message: `Проба ${sample.number} выходит за глубину скважины ${totalDepth} м.` })
  })
  return issues
}

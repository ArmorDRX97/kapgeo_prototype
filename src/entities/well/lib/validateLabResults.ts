import type { LabResult } from '../model/types'

export type LabResultIssue = { resultId: string; message: string }

export function validateLabResults(results: LabResult[]): LabResultIssue[] {
  return results.flatMap((result) => {
    const issues: LabResultIssue[] = []
    if (!Number.isFinite(result.value) || result.value < 0) issues.push({ resultId: result.id, message: `${result.analyte}: значение не может быть отрицательным.` })
    if (result.analyte === 'pH' && (result.unit !== 'pH' || result.value > 14)) issues.push({ resultId: result.id, message: 'pH указывается в единице pH и находится в диапазоне 0–14.' })
    if (result.analyte !== 'pH' && result.unit !== 'мг/кг') issues.push({ resultId: result.id, message: `${result.analyte} требует единицу мг/кг.` })
    return issues
  })
}

import type { LabResult } from '../model/types'
import { validateMeasuredValue } from '../../../shared/scientific/quantities/registry'
import type { QuantityId } from '../../../shared/scientific/quantities/types'

export type LabResultIssue = { resultId: string; message: string }

export function labAnalyteQuantity(analyte: LabResult['analyte']): QuantityId {
  return analyte === 'pH' ? 'ph' : 'mass_concentration'
}

export function validateLabResults(results: LabResult[]): LabResultIssue[] {
  return results.flatMap((result) => validateMeasuredValue({
    quantityId: labAnalyteQuantity(result.analyte),
    value: result.value,
    unitId: result.unit,
    qualifier: result.qualifier,
    missingReason: result.missingReason,
    uncertainty: result.uncertainty,
    source: { id: result.id, label: `${result.method} · ${result.analyst}` },
  }).map((issue) => ({ resultId: result.id, message: `${result.analyte}: ${issue.message}` })))
}

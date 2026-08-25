export type QuantityId = 'length' | 'diameter' | 'mass_concentration' | 'ph' | 'bulk_density' | 'recovery'
export type UnitId = 'м' | 'см' | 'мм' | 'мг/кг' | 'г/т' | 'ppm' | '%' | 'pH' | 'кг/м³' | 'т/м³'
export type ValueQualifier = 'lt' | 'lte' | 'gt' | 'gte' | 'approx'

export type SourceRef = {
  id: string
  label: string
  versionId?: string
}

export type MeasuredValue = {
  quantityId: QuantityId
  value?: number
  unitId: UnitId
  qualifier?: ValueQualifier
  missingReason?: string
  uncertainty?: number
  source: SourceRef
  observedAt?: string
}

export type QuantityDefinition = {
  id: QuantityId
  label: string
  dimension: 'length' | 'mass_fraction' | 'density' | 'dimensionless'
  canonicalUnitId: UnitId
  allowedUnitIds: UnitId[]
  canonicalRange?: { min?: number; max?: number }
}

export type UnitDefinition = {
  id: UnitId
  label: string
  dimension: QuantityDefinition['dimension']
  scaleToCanonical: number
  offsetToCanonical: number
  decimals: number
}

export type QuantityIssue = {
  code: 'unknown-quantity' | 'unknown-unit' | 'incompatible-unit' | 'missing-value' | 'missing-reason' | 'invalid-value' | 'invalid-uncertainty' | 'outside-range'
  message: string
}

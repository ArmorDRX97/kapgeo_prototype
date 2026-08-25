import type { MeasuredValue, QuantityDefinition, QuantityId, QuantityIssue, UnitDefinition, UnitId } from './types'

export const unitDefinitions: Record<UnitId, UnitDefinition> = {
  'м': { id: 'м', label: 'метр', dimension: 'length', scaleToCanonical: 1, offsetToCanonical: 0, decimals: 2 },
  'см': { id: 'см', label: 'сантиметр', dimension: 'length', scaleToCanonical: 0.01, offsetToCanonical: 0, decimals: 1 },
  'мм': { id: 'мм', label: 'миллиметр', dimension: 'length', scaleToCanonical: 0.001, offsetToCanonical: 0, decimals: 0 },
  'мг/кг': { id: 'мг/кг', label: 'миллиграмм на килограмм', dimension: 'mass_fraction', scaleToCanonical: 1, offsetToCanonical: 0, decimals: 3 },
  'г/т': { id: 'г/т', label: 'грамм на тонну', dimension: 'mass_fraction', scaleToCanonical: 1, offsetToCanonical: 0, decimals: 3 },
  'ppm': { id: 'ppm', label: 'частей на миллион', dimension: 'mass_fraction', scaleToCanonical: 1, offsetToCanonical: 0, decimals: 3 },
  '%': { id: '%', label: 'процент', dimension: 'mass_fraction', scaleToCanonical: 10_000, offsetToCanonical: 0, decimals: 5 },
  'pH': { id: 'pH', label: 'pH', dimension: 'dimensionless', scaleToCanonical: 1, offsetToCanonical: 0, decimals: 2 },
  'кг/м³': { id: 'кг/м³', label: 'килограмм на кубический метр', dimension: 'density', scaleToCanonical: 1, offsetToCanonical: 0, decimals: 1 },
  'т/м³': { id: 'т/м³', label: 'тонна на кубический метр', dimension: 'density', scaleToCanonical: 1_000, offsetToCanonical: 0, decimals: 3 },
}

export const quantityDefinitions: Record<QuantityId, QuantityDefinition> = {
  length: { id: 'length', label: 'Длина', dimension: 'length', canonicalUnitId: 'м', allowedUnitIds: ['м', 'см', 'мм'], canonicalRange: { min: 0 } },
  diameter: { id: 'diameter', label: 'Диаметр', dimension: 'length', canonicalUnitId: 'мм', allowedUnitIds: ['мм', 'см', 'м'], canonicalRange: { min: 0 } },
  mass_concentration: { id: 'mass_concentration', label: 'Массовая концентрация', dimension: 'mass_fraction', canonicalUnitId: 'мг/кг', allowedUnitIds: ['мг/кг', 'г/т', 'ppm', '%'], canonicalRange: { min: 0 } },
  ph: { id: 'ph', label: 'Водородный показатель', dimension: 'dimensionless', canonicalUnitId: 'pH', allowedUnitIds: ['pH'], canonicalRange: { min: 0, max: 14 } },
  bulk_density: { id: 'bulk_density', label: 'Объёмная плотность', dimension: 'density', canonicalUnitId: 'кг/м³', allowedUnitIds: ['кг/м³', 'т/м³'], canonicalRange: { min: 0 } },
  recovery: { id: 'recovery', label: 'Выход керна', dimension: 'mass_fraction', canonicalUnitId: '%', allowedUnitIds: ['%'], canonicalRange: { min: 0, max: 100 } },
}

export function getQuantityDefinition(quantityId: QuantityId): QuantityDefinition {
  return quantityDefinitions[quantityId]
}

export function getAllowedUnits(quantityId: QuantityId): UnitDefinition[] {
  return quantityDefinitions[quantityId].allowedUnitIds.map((unitId) => unitDefinitions[unitId])
}

export function convertQuantity(value: number, fromUnitId: UnitId, toUnitId: UnitId): number {
  const from = unitDefinitions[fromUnitId]
  const to = unitDefinitions[toUnitId]
  if (!from || !to || from.dimension !== to.dimension) {
    throw new Error(`Нельзя преобразовать ${fromUnitId} в ${toUnitId}: несовместимые размерности.`)
  }
  const canonical = value * from.scaleToCanonical + from.offsetToCanonical
  return (canonical - to.offsetToCanonical) / to.scaleToCanonical
}

export function toCanonicalValue(measurement: MeasuredValue): number | undefined {
  if (measurement.value === undefined) return undefined
  const quantity = quantityDefinitions[measurement.quantityId]
  return convertQuantity(measurement.value, measurement.unitId, quantity.canonicalUnitId)
}

export function validateMeasuredValue(measurement: MeasuredValue): QuantityIssue[] {
  const quantity = quantityDefinitions[measurement.quantityId]
  if (!quantity) return [{ code: 'unknown-quantity', message: `Неизвестная величина ${measurement.quantityId}.` }]
  const unit = unitDefinitions[measurement.unitId]
  if (!unit) return [{ code: 'unknown-unit', message: `Неизвестная единица ${measurement.unitId}.` }]

  const issues: QuantityIssue[] = []
  if (!quantity.allowedUnitIds.includes(measurement.unitId)) {
    issues.push({ code: 'incompatible-unit', message: `${quantity.label}: единица ${measurement.unitId} несовместима с величиной.` })
  }
  if (measurement.value === undefined) {
    if (!measurement.missingReason?.trim()) issues.push({ code: 'missing-reason', message: `${quantity.label}: для отсутствующего значения укажите причину.` })
    if (measurement.qualifier) issues.push({ code: 'missing-value', message: `${quantity.label}: qualifier нельзя указать без числового значения.` })
    return issues
  }
  if (measurement.missingReason?.trim()) issues.push({ code: 'missing-value', message: `${quantity.label}: числовое значение и причина отсутствия не могут быть указаны одновременно.` })
  if (!Number.isFinite(measurement.value)) issues.push({ code: 'invalid-value', message: `${quantity.label}: значение должно быть конечным числом.` })
  if (measurement.uncertainty !== undefined && (!Number.isFinite(measurement.uncertainty) || measurement.uncertainty < 0)) {
    issues.push({ code: 'invalid-uncertainty', message: `${quantity.label}: неопределённость должна быть неотрицательной.` })
  }
  if (issues.some((issue) => ['incompatible-unit', 'invalid-value'].includes(issue.code))) return issues

  const canonical = toCanonicalValue(measurement)
  if (canonical !== undefined && quantity.canonicalRange) {
    const { min, max } = quantity.canonicalRange
    if ((min !== undefined && canonical < min) || (max !== undefined && canonical > max)) {
      issues.push({ code: 'outside-range', message: `${quantity.label}: значение вне допустимого диапазона в канонической единице ${quantity.canonicalUnitId}.` })
    }
  }
  return issues
}

export function formatMeasuredValue(measurement: MeasuredValue, locale = 'ru-RU'): string {
  if (measurement.value === undefined) return measurement.missingReason ? `Нет данных: ${measurement.missingReason}` : 'Нет данных'
  const qualifier = { lt: '<', lte: '≤', gt: '>', gte: '≥', approx: '≈' }[measurement.qualifier ?? 'approx']
  const prefix = measurement.qualifier ? `${qualifier} ` : ''
  const decimals = unitDefinitions[measurement.unitId].decimals
  return `${prefix}${measurement.value.toLocaleString(locale, { maximumFractionDigits: decimals })} ${measurement.unitId}`
}

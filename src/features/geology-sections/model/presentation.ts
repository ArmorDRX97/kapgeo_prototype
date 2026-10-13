import type { ColumnSettings, SectionLayer } from '../../../entities/geology-section/model/types'
export const defaultColumns: ColumnSettings = { width: 12, offset: 0, lithology: true, intervals: true, curves: true, curveMin: 0, curveMax: 80 }
export const rockNames = { sand: 'Песок', clay: 'Глина', silt: 'Алеврит' }
export const layerNames: Record<SectionLayer, string> = { technology: 'Технологические пропластки', ore: 'Руда в технологической толще', uncorrected: 'Руда без поправок', offbalance: 'Технологический забаланс' }
export function nextLocalId(items: Array<{ id: string }>, prefix: string) { let n = 1; while (items.some(i => i.id === `${prefix}-${n}`)) n++; return `${prefix}-${n}` }

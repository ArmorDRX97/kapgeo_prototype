import type { AlphaDocument, MeasurementKind, MeasurementRecord } from './alphaTypes'
import type { InterpretationWell } from './types'

const gaussian = (d: number, center: number, width: number) => Math.exp(-(((d - center) / width) ** 2))
const sourceCache = new WeakMap<InterpretationWell, MeasurementRecord[]>()
export function alphaRecords(well: InterpretationWell): MeasurementRecord[] {
  const cached = sourceCache.get(well); if (cached) return cached
  if (!well.curves.length) return []
  const phase = well.id.endsWith('02') ? 0.4 : well.id.endsWith('04') ? 0.2 : 0
  const make = (id: string, kind: MeasurementKind, name: string, unit: string, fn: (depth: number) => number,
    stage: MeasurementRecord['stage'] = 'primary', role: MeasurementRecord['role'] = 'main', step = 0.1): MeasurementRecord => {
    const depths = Array.from({ length: Math.floor(well.depth / step) + 1 }, (_, i) => Number((i * step).toFixed(4)))
    return { id, kind, name, unit, stage, role, date: role === 'control' ? '2026-10-09' : '2026-10-08', instrument: kind === 'GR' ? 'ГК-60 · 011' : 'ГИС-1 · 206', operator: role === 'control' ? 'Оператор 2' : 'Оператор 1', revision: 1, operations: [], depths, values: depths.map(fn) }
  }
  const gr = (d: number) => 22 + 4 * Math.sin(d * 4) + 510 * gaussian(d, 119.8 + phase, 0.9) + 320 * gaussian(d, 123.1, 0.55) + 740 * gaussian(d, 132, 1.2)
  const rs = (d: number) => 8 + 31 * gaussian(d, 120, 3.4) + 16 * gaussian(d, 126, 1.2) + 52 * gaussian(d, 132.5, 2.2) + 1.8 * Math.sin(d * 3)
  const tk = (d: number) => 12 + 135 / (1 + Math.exp(-(d - 117.5) * 5)) - 133 / (1 + Math.exp(-(d - 135) * 5))
  const records = [
    make('alpha-gr', 'GR', 'ГК · основной', 'мкР/ч', gr), make('alpha-gr-control', 'GR', 'ГК · контрольный', 'мкР/ч', d => gr(d + 0.1) * 1.035, 'repeat', 'control'),
    make('alpha-rs', 'RS', 'КС · основной', 'Ом·м', rs), make('alpha-rs-control', 'RS', 'КС · контрольный', 'Ом·м', d => rs(d + 0.08) * 1.04, 'repeat', 'control'),
    make('alpha-sp', 'SP', 'ПС', 'мВ', d => -45 + 20 * gaussian(d, 120, 3) + 32 * gaussian(d, 132, 2) + 2 * Math.sin(d)),
    make('alpha-tk', 'TK', 'ТК · освоение', 'мА', tk, 'development'),
    make('alpha-il', 'IL', 'ИК · обсаженная', 'мСм/м', d => 10 + [114, 117.5, 126, 135].reduce((s, c) => s + 760 * gaussian(d, c - 0.18, 0.12) + 700 * gaussian(d, c + 0.18, 0.12) - 500 * gaussian(d, c, 0.1), 0), 'development'),
    make('alpha-tm', 'TM', 'ТМ · первичная', '°C', d => 18 + d * 0.029 + 3.8 * gaussian(d, 109, 4.5), 'development'),
    make('alpha-tm-repeat', 'TM', 'ТМ · повторная', '°C', d => 18 + d * 0.029 + 2.6 * gaussian(d, 109.4, 5.1), 'repeat'),
    make('alpha-km', 'CAL', 'КМ · до расширения', 'мм', d => 161 + 6 * Math.sin(d * 0.7) + 12 * gaussian(d, 122, 2)),
    make('alpha-kmr', 'CAL', 'КМр · после расширения', 'мм', d => 165 + 205 / (1 + Math.exp(-(d - 115.2) * 4)) - 202 / (1 + Math.exp(-(d - 139.2) * 4)) - 63 * gaussian(d, 128, 0.65), 'expanded'),
    make('alpha-flow', 'FLOW', 'РМ · налив', 'имп/мин', d => 300 + 25 * (Math.max(0, 135 - d) + 12 * Math.max(0, Math.min(1, (132 - d) / 2)) + 9 * Math.max(0, Math.min(1, (121 - d) / 2))), 'development', 'main', 0.5),
  ]
  const curve = records.find(r => r.id === 'alpha-rs')!
  curve.values = curve.values.map((v, i) => curve.depths[i]! >= 128.4 && curve.depths[i]! <= 129.1 ? null : v)
  sourceCache.set(well, records)
  return records
}
export const allAlphaRecords = (well: InterpretationWell, doc: AlphaDocument) => [...alphaRecords(well), ...doc.derived]

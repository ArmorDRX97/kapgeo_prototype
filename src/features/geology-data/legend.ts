import { z } from 'zod'
import { columnRockSymbols, geologyHatches, type GeologyHatch } from '../../shared/scientific/geology/standard16'

const entry = z.object({
  name: z.string().min(1).max(60), code: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  pattern: z.enum(Object.keys(geologyHatches) as [GeologyHatch, ...GeologyHatch[]]),
})
export type LegendEntry = z.infer<typeof entry>
export const legendSchema = z.array(entry).min(1).max(80)
const legacyLegend: LegendEntry[] = ['Суглинок', 'Песчаник', 'Алевролит', 'Глина', 'Рудный песчаник', 'Песок мелкозернистый', 'Песок среднезернистый', 'Известняк', 'Гравий', 'Мергель'].map((name, i) => ({ name, code: `L${String(i + 1).padStart(2, '0')}`, color: ['#e2cfad', '#e5c274', '#d7cba8', '#b6c5b6', '#d7a25c', '#f1df9c', '#f5e8b8', '#bcd6e8', '#d9b07c', '#bed3b6'][i]!, pattern: i === 3 ? 'lines' : i === 4 ? 'diagonal' : 'dots' }))

const standardLegend: LegendEntry[] = legacyLegend.map(row => {
  const symbol = columnRockSymbols[row.name]
  return symbol ? { ...row, code: symbol.code, pattern: symbol.pattern, color: '#ffffff' } : row
})

export function readLegend(): LegendEntry[] {
  try {
    const rows = legendSchema.parse(JSON.parse(localStorage.getItem('kapgeo.legend.2026.v1') ?? 'null'))
    return rows.map(row => {
      const index = legacyLegend.findIndex(legacy =>
        legacy.name === row.name && legacy.code === row.code && legacy.pattern === row.pattern && legacy.color === row.color,
      )
      const updated = standardLegend[index]
      return updated && !rows.some(other => other !== row && other.code === updated.code) ? updated : row
    })
  } catch {
    return standardLegend
  }
}

export function columnLithologyCode(name: string, code: string | undefined, legend: LegendEntry[]) {
  const displayCode = legend.find(row => row.name === name)?.code
  if (!code || legacyLegend.some(row => row.name === name && row.code === code)) return displayCode ?? code
  return code
}

import { z } from 'zod'
const entry = z.object({ name: z.string().min(1).max(60), code: z.string().min(1).max(30), color: z.string().regex(/^#[0-9a-f]{6}$/i), pattern: z.enum(['dots', 'lines', 'diagonal', 'none']) })
export type LegendEntry = z.infer<typeof entry>
export const demoLegend: LegendEntry[] = ['Суглинок', 'Песчаник', 'Алевролит', 'Глина', 'Рудный песчаник', 'Песок мелкозернистый', 'Песок среднезернистый', 'Известняк', 'Гравий', 'Мергель'].map((name, i) => ({ name, code: `L${String(i + 1).padStart(2, '0')}`, color: ['#e2cfad', '#e5c274', '#d7cba8', '#b6c5b6', '#d7a25c', '#f1df9c', '#f5e8b8', '#bcd6e8', '#d9b07c', '#bed3b6'][i]!, pattern: i === 3 ? 'lines' : i === 4 ? 'diagonal' : 'dots' }))
export function readLegend(): LegendEntry[] { try { return z.array(entry).min(1).max(80).parse(JSON.parse(localStorage.getItem('kapgeo.legend.2026.v1') ?? 'null')) } catch { return demoLegend } }

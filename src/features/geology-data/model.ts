import { z } from 'zod'
export const factSchema = z.object({ well: z.string().min(1), x: z.number().finite(), y: z.number().finite(), z: z.number().finite(), depth: z.number().finite().positive(), from: z.number().finite().nonnegative(), to: z.number().finite().positive(), u: z.number().finite().nonnegative(), kf: z.number().finite().nonnegative(), lft: z.number().int().nonnegative() }).refine(r => r.to > r.from && r.to <= r.depth, 'Границы интервала выходят за ствол')
export type FactRow = z.infer<typeof factSchema>
export const factColumns = ['well', 'x', 'y', 'z', 'depth', 'from', 'to', 'u', 'kf', 'lft'] as const
export const factLabels = ['Скважина', 'X, м', 'Y, м', 'Z, м', 'Глубина, м', 'От, м', 'До, м', 'U, %', 'Кф, м/сут', 'ЛФТ']
export const exampleFacts: FactRow[] = Array.from({ length: 12 }, (_, i) => ({ well: `Р-${101 + i}`, x: 57500 + i * 38, y: 95200 + i % 4 * 60, z: 184 + i % 3, depth: 520 + i, from: 440 + i * .6, to: 446 + i * .8, u: .04 + i * .003, kf: i % 3 ? 8.2 : .04, lft: i % 3 ? 2 : 0 }))
const cell = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`
export function factsCsv(rows: FactRow[]) { return '\ufeff' + [factColumns.join(';'), ...rows.map(r => factColumns.map(c => cell(r[c])).join(';'))].join('\r\n') }
/** The review template deliberately requires a simple semicolon table, not arbitrary Excel files. */
export function parseFactsCsv(text: string): FactRow[] {
  const lines = text.replace(/^\ufeff/, '').trim().split(/\r?\n/)
  if (lines.length < 2 || lines.length > 5001 || lines[0] !== factColumns.join(';')) throw new Error('Нужен CSV по скачанному шаблону, от 1 до 5000 строк. Разделитель — точка с запятой.')
  const rows = lines.slice(1).map((line, i) => {
    const values = line.match(/("(?:[^"]|"")*"|[^;]*)(;|$)/g)?.filter(v => v !== '').map(v => v.replace(/;$/, '').replace(/^"|"$/g, '').replaceAll('""', '"')) ?? []
    if (values.length !== factColumns.length) throw new Error(`Строка ${i + 2}: проверьте число столбцов`)
    const result = factSchema.safeParse(Object.fromEntries(factColumns.map((c, n) => [c, n ? Number(values[n]!.replace(',', '.')) : values[n]])))
    if (!result.success || values.some(v => !v.trim())) throw new Error(`Строка ${i + 2}: заполните поля и проверьте численные значения и глубины`)
    return result.data
  })
  if (new Set(rows.map(r => r.well)).size !== rows.length) throw new Error('В шаблоне допускается одна строка на скважину. Найдены повторяющиеся номера.')
  return rows
}
export function saveText(text: string, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const mifHeader = 'Version 1520\nCharset "UTF-8"\nDelimiter ","\nCoordSys NonEarth Units "m"\nColumns 2\nName Char(120)\nLayer Char(40)\nData\n'
export const midCell = (name: string, layer: string) => `${cell(name)},${cell(layer)}`

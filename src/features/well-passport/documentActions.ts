import { curveValue, lithologyIntervals, number, oreIntervals, trackDefinitions, type PassportSettings, type PassportWell, type TrackId } from './model'

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function serializeSheet(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', '420mm'); clone.setAttribute('height', '297mm')
  clone.querySelectorAll('[data-track]').forEach(el => { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label'); el.removeAttribute('class') })
  return new XMLSerializer().serializeToString(clone)
}
export async function rasterSheet(source: string, format: 'png' | 'jpeg'): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Не удалось подготовить изображение. Попробуйте экспорт SVG.')); image.src = url })
    const canvas = document.createElement('canvas'); canvas.width = 2520; canvas.height = 1782
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Браузер не поддерживает экспорт изображения.')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать файл изображения.')), `image/${format}`, .95))
  } finally { URL.revokeObjectURL(url) }
}
export function dataRows(id: TrackId, well: PassportWell, s: PassportSettings): { columns: string[]; rows: (string | number)[][] } {
  if (id === 'lithology' || id === 'stratigraphy') return { columns: ['От, м', 'До, м', id === 'lithology' ? 'Порода' : 'Горизонт'], rows: lithologyIntervals(well).filter(l => l.to > s.from && l.from < s.to).map(l => [l.from, l.to, id === 'lithology' ? l.label : l.from >= 426 + well.offset && l.to <= 500 + well.offset ? 'K₂ · мынкудукский' : 'Вмещающие отложения']) }
  if (id === 'ore') return { columns: ['От, м', 'До, м', 'Мощность, м', 'U, %'], rows: oreIntervals(well, s.oreSource).filter(o => o.to > s.from && o.from < s.to).map(o => [o.from, o.to, Number((o.to - o.from).toFixed(1)), o.value!]) }
  if (id === 'construction') return { columns: ['От, м', 'До, м', 'Элемент', 'Параметры'], rows: [[0, 442 + well.offset, 'Обсадная колонна', 'ПНД · Ø 90 мм'], [0, 442 + well.offset, 'Цементное кольцо', 'До кровли фильтра'], [442 + well.offset, 483 + well.offset, 'Фильтр', 'Щелевой · Ø 90 мм'], [483 + well.offset, 488 + well.offset, 'Отстойник', 'Длина 5 м']] }
  if (id === 'core') return { columns: ['Рейс', 'От, м', 'До, м', 'Выход, %'], rows: Array.from({ length: Math.ceil((s.to - s.from) / 4) }, (_, i) => { const d = Math.floor(s.from / 4) * 4 + i * 4; return [Math.floor(d / 4) + 1, d, Math.min(well.depth, d + 4), 76 + (i % 4) * 5] }) }
  if (id === 'samples' || id === 'radium') return { columns: ['Проба', 'От, м', 'До, м', 'Вид', id === 'radium' ? 'Ra, Бк/кг' : 'U, %'], rows: Array.from({ length: 20 }, (_, i) => { const d = 439 + well.offset + i * 2.5; return { d, row: [i % 5 === 0 ? `М-${i + 1}` : String(101 + i), d, d + 2.5, i % 5 === 0 ? 'Монолит' : i % 3 === 0 ? 'Гранулометрия' : 'Химический анализ', Number(curveValue(id === 'radium' ? 'radium' : 'knd', d, well).toFixed(id === 'radium' ? 1 : 3))] } }).filter(v => v.d + 2.5 > s.from && v.d < s.to).map(v => v.row) }
  return { columns: ['Глубина, м', trackDefinitions.find(t => t.id === id)!.detail], rows: Array.from({ length: Math.floor((s.to - s.from) / 5) + 1 }, (_, i) => { const d = s.from + i * 5; return [d, Number(curveValue(id, d, well).toFixed(id === 'knd' ? 3 : 2))] }) }
}
const xml = (s: string | number) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
export function excelDocument(well: PassportWell, s: PassportSettings) {
  const rows: (string | number)[][] = [[`Паспорт скважины ${well.name}`], ['Месторождение', 'Инкай · Участок № 2'], ['Интервал, м', s.from, s.to], ['Масштаб', `1:${s.scale}`], ['Координаты устья', well.x, well.y, well.z], []]
  for (const id of s.tracks) { const data = dataRows(id, well, s); rows.push([trackDefinitions.find(t => t.id === id)!.name], data.columns, ...data.rows, []) }
  const content = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Паспорт"><Table>${rows.map(row => `<Row>${row.map(v => `<Cell><Data ss:Type="${typeof v === 'number' ? 'Number' : 'String'}">${xml(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`
  return new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' })
}
export const cellText = (v: string | number) => typeof v === 'number' ? number(v, 3) : v

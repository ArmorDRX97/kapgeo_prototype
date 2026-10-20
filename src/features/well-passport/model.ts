/** Independent examples for the passport workspace; no BGD or interpretation data is read here. */
export type TemplateId = 'core' | 'open' | 'hydro'
export type TrackId = 'stratigraphy' | 'lithology' | 'gamma' | 'resistivity' | 'knd' | 'ore' | 'kf' | 'construction' | 'core' | 'samples' | 'deviation'
export const templates: { id: TemplateId; name: string; description: string; tracks: TrackId[] }[] = [
  { id: 'core', name: 'Керновая', description: 'Геология, ГИС, рейсы и опробование', tracks: ['stratigraphy', 'lithology', 'gamma', 'resistivity', 'ore', 'construction', 'core', 'samples'] },
  { id: 'open', name: 'Бескерновая', description: 'ГИС, рудные интервалы и конструкция', tracks: ['stratigraphy', 'lithology', 'gamma', 'resistivity', 'knd', 'ore', 'kf', 'construction'] },
  { id: 'hydro', name: 'Гидрогеологическая', description: 'Водоносный горизонт, фильтры и откачка', tracks: ['stratigraphy', 'lithology', 'gamma', 'resistivity', 'kf', 'construction', 'deviation'] },
]
export const trackDefinitions: { id: TrackId; name: string; detail: string; color: string }[] = [
  { id: 'stratigraphy', name: 'Стратиграфия', detail: 'Возраст и продуктивный горизонт', color: '#8c769c' },
  { id: 'lithology', name: 'Литология', detail: 'Породы и границы интервалов', color: '#b9a46c' },
  { id: 'gamma', name: 'Гамма-каротаж', detail: 'ГК · мкР/ч', color: '#33916b' },
  { id: 'resistivity', name: 'Сопротивление', detail: 'КС · Ом·м', color: '#b95a68' },
  { id: 'knd', name: 'КНД', detail: 'Содержание урана · %', color: '#8561a7' },
  { id: 'ore', name: 'Рудные интервалы', detail: 'Мощность и содержание', color: '#c38d34' },
  { id: 'kf', name: 'Коэффициент фильтрации', detail: 'Кф · м/сут', color: '#3d83a3' },
  { id: 'construction', name: 'Конструкция', detail: 'Обсадка, фильтр, цемент, отстойник', color: '#7d8da5' },
  { id: 'core', name: 'Рейсы и выход керна', detail: 'Интервалы бурения · %', color: '#a4855c' },
  { id: 'samples', name: 'Пробы и анализы', detail: 'Химия, грансостав и монолиты', color: '#b67c91' },
  { id: 'deviation', name: 'Инклинометрия', detail: 'Отклонение ствола · м', color: '#6673a5' },
]
export type PassportWell = {
  id: string; name: string; kind: TemplateId; purpose: string; block: string; depth: number; x: number; y: number; z: number; offset: number
}
export const passportWells: PassportWell[] = [
  { id: 'PS-101', name: 'ГС-101', kind: 'core', purpose: 'Разведочная', block: '24-7', depth: 528, x: 4385267.4, y: 521486.2, z: 184.6, offset: 0 },
  { id: 'PS-102', name: 'ГС-102', kind: 'core', purpose: 'Разведочная', block: '24-7', depth: 536, x: 4385388.1, y: 521584.7, z: 185.2, offset: 4 },
  { id: 'PS-103', name: 'ГС-103', kind: 'core', purpose: 'Разведочная', block: '24-8', depth: 520, x: 4385462.5, y: 521703.1, z: 182.8, offset: -5 },
  { id: 'PS-104', name: 'ГС-104', kind: 'core', purpose: 'Разведочная', block: '24-8', depth: 543, x: 4385574.3, y: 521827.6, z: 183.5, offset: 7 },
  { id: 'PS-201', name: 'ТС-201', kind: 'open', purpose: 'Закачная', block: '24-7', depth: 516, x: 4385308.9, y: 521522.4, z: 184.1, offset: 2 },
  { id: 'PS-202', name: 'ТС-202', kind: 'open', purpose: 'Откачная', block: '24-7', depth: 522, x: 4385347.2, y: 521567.3, z: 184.4, offset: 3 },
  { id: 'PS-203', name: 'ТС-203', kind: 'open', purpose: 'Откачная', block: '24-8', depth: 530, x: 4385489.7, y: 521752.8, z: 182.9, offset: 5 },
  { id: 'PS-301', name: 'ГГ-301', kind: 'hydro', purpose: 'Гидрогеологическая', block: '24-7', depth: 525, x: 4385195.6, y: 521409.1, z: 184.3, offset: -2 },
  { id: 'PS-302', name: 'ГГ-302', kind: 'hydro', purpose: 'Наблюдательная', block: '24-8', depth: 532, x: 4385537.4, y: 521788.5, z: 183.7, offset: 6 },
]
export type PassportSettings = {
  template: TemplateId; from: number; to: number; scale: 200 | 500 | 1000; tracks: TrackId[]
  lithology: 'summary' | 'core' | 'logging'; oreSource: 'gamma' | 'knd' | 'samples'; grid: boolean; legend: boolean; color: boolean
  author: string; date: string; note: string; gammaMax: number
}
export const PASSPORT_STORAGE_PREFIX = 'kapgeo.passport.design.v1.'
export function defaultSettings(well: PassportWell): PassportSettings {
  return { template: well.kind, from: 420 + well.offset, to: 510 + well.offset, scale: 500, tracks: [...templates.find(t => t.id === well.kind)!.tracks], lithology: 'summary', oreSource: 'gamma', grid: true, legend: true, color: true, author: 'И. А. Иванова', date: '2026-10-20', note: '', gammaMax: 100 }
}
export function loadSettings(well: PassportWell): PassportSettings {
  const fallback = defaultSettings(well)
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PASSPORT_STORAGE_PREFIX + well.id) ?? 'null')
    if (!value || typeof value !== 'object') return fallback
    const v = value as Partial<PassportSettings>
    if (!templates.some(t => t.id === v.template) || ![200, 500, 1000].includes(v.scale ?? 0) || !Number.isFinite(v.from) || !Number.isFinite(v.to) || v.from! < 0 || v.to! > well.depth || v.to! <= v.from!) return fallback
    if (!Array.isArray(v.tracks) || !v.tracks.length || !v.tracks.every(id => trackDefinitions.some(t => t.id === id)) || new Set(v.tracks).size !== v.tracks.length) return fallback
    return { ...fallback, ...v, tracks: [...v.tracks], lithology: ['summary', 'core', 'logging'].includes(v.lithology ?? '') ? v.lithology! : fallback.lithology, oreSource: ['gamma', 'knd', 'samples'].includes(v.oreSource ?? '') ? v.oreSource! : fallback.oreSource, gammaMax: [50, 100, 200].includes(v.gammaMax ?? 0) ? v.gammaMax! : 100, grid: typeof v.grid === 'boolean' ? v.grid : true, legend: typeof v.legend === 'boolean' ? v.legend : true, color: typeof v.color === 'boolean' ? v.color : true, author: typeof v.author === 'string' ? v.author.slice(0, 60) : fallback.author, date: typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : fallback.date, note: typeof v.note === 'string' ? v.note.slice(0, 160) : '' }
  } catch { return fallback }
}
export function validatePassportSearch(search: Record<string, unknown>): { well?: string } {
  return { well: typeof search.well === 'string' ? search.well : undefined }
}
export const number = (n: number, digits = 1) => n.toLocaleString('ru-RU', { maximumFractionDigits: digits })
export type Interval = { from: number; to: number; label: string; color: string; value?: number }
export function lithologyIntervals(well: PassportWell): Interval[] {
  const o = well.offset
  return [
    { from: 0, to: 124, label: 'Суглинок', color: '#e2cfad' }, { from: 124, to: 326, label: 'Глина', color: '#b6c5b6' },
    { from: 326, to: 426 + o, label: 'Алевролит', color: '#d7cba8' }, { from: 426 + o, to: 442 + o, label: 'Песок мелкозернистый', color: '#f1df9c' },
    { from: 442 + o, to: 456 + o, label: 'Песок среднезернистый', color: '#f5e8b8' }, { from: 456 + o, to: 464 + o, label: 'Глина', color: '#b6c5b6' },
    { from: 464 + o, to: 483 + o, label: 'Песок среднезернистый', color: '#f5e8b8' }, { from: 483 + o, to: 500 + o, label: 'Алевролит', color: '#d7cba8' },
    { from: 500 + o, to: well.depth, label: 'Глина', color: '#b6c5b6' },
  ]
}
export function oreIntervals(well: PassportWell, source: PassportSettings['oreSource'] = 'gamma'): Interval[] {
  const shift = source === 'knd' ? 0.4 : source === 'samples' ? -0.2 : 0
  return [{ from: 447.4 + well.offset + shift, to: 452.8 + well.offset + shift, label: '0,064 %', value: .064, color: '#d7a25c' }, { from: 468.2 + well.offset + shift, to: 475.6 + well.offset + shift, label: '0,091 %', value: .091, color: '#d7a25c' }]
}
export function curveValue(id: TrackId, depth: number, well: PassportWell) {
  const d = depth - well.offset
  const wave = Math.sin(d * 1.7) * .9 + Math.sin(d * 3.21) * .5 + Math.sin(d * .21) * 2
  const peak = Math.exp(-(((d - 450) / 2.8) ** 2)) + 1.4 * Math.exp(-(((d - 472) / 4.1) ** 2))
  if (id === 'gamma') return Math.max(0, 10 + wave * 1.8 + peak * 49)
  if (id === 'resistivity') return Math.max(0, 12 + Math.sin(d * .16) * 6 + wave * .6 + (d > 442 && d < 483 ? 9 : 0))
  if (id === 'knd') return Math.max(0, .005 + peak * .063 + wave * .0006)
  if (id === 'kf') return d > 442 && d < 483 && !(d > 456 && d < 464) ? 8.2 + Math.sin(d * .3) * 2.5 : .6
  return 1.2 + depth / well.depth * 3.4 + Math.sin(depth * .05) * .25
}
export type PageRange = { from: number; to: number }
/** A3 landscape: 180 mm for depth tracks, matching the selected physical scale. */
export function passportPages(settings: PassportSettings): PageRange[] {
  const span = settings.scale * .18, pages: PageRange[] = []
  for (let from = settings.from; from < settings.to - .00001; from += span) pages.push({ from, to: Math.min(settings.to, Math.round((from + span) * 1000) / 1000) })
  return pages
}

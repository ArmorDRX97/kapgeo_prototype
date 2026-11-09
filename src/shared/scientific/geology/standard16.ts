/** СТ НАК 16-2026, таблицы 1, 3, 4, 6 и 8. Геометрия тайлов адаптирована для экрана. */
export const geologyHatches = {
  none: { title: 'Без крапа', size: 8, line: '', dots: '' },
  dots: { title: 'Точки', size: 8, line: '', dots: 'M2 2h1v1H2z M6 6h1v1H6z' },
  lines: { title: 'Линии', size: 8, line: 'M0 4H8', dots: '' },
  diagonal: { title: 'Штриховка', size: 8, line: 'M0 8L8 0', dots: '' },
  'sand-medium': { title: 'Среднезернистые пески', size: 10, line: '', dots: 'M2 2h1.2v1.2H2z M7 7h1.2v1.2H7z' },
  'sand-fine': { title: 'Мелкозернистые пески', size: 6, line: '', dots: 'M1 1h.8v.8H1z M4 4h.8v.8H4z' },
  'clay-wave': { title: 'Волнистые штрихи', size: 14, line: 'M1 4q1.5-3 3 0t3 0 M8 11q1.5-3 3 0t3 0', dots: '' },
  'silt-dash': { title: 'Разреженные горизонтальные штрихи', size: 14, line: 'M1 4h6 M8 11h6', dots: '' },
  'sandstone-bands': { title: 'Слои с точками', size: 12, line: 'M0 3h12 M0 9h12', dots: 'M2 5h1v1H2z M8 5h1v1H8z M5 11h1v1H5z M11 11h1v1h-1z' },
  'gravel-rings': { title: 'Контуры зёрен гравия', size: 14, line: 'M3 2a1.6 1.2 0 1 0 0 2.4 1.6 1.2 0 1 0 0-2.4z M10 9a2.1 1.4 0 1 0 0 2.8 2.1 1.4 0 1 0 0-2.8z', dots: '' },
  'loam-dash': { title: 'Короткие вертикальные штрихи', size: 10, line: 'M2 1v3 M7 6v3', dots: '' },
  'limestone-brick': { title: 'Кирпичная кладка', size: 14, line: 'M0 0h14 M0 7h14 M4 0v7 M11 7v7', dots: '' },
  'marl-lines': { title: 'Горизонтали с наклонными штрихами', size: 12, line: 'M0 0h12 M0 6h12 M0 6l6-6 M6 6l6-6 M0 12l6-6 M6 12l6-6', dots: '' },
} as const

export type GeologyHatch = keyof typeof geologyHatches

export function geologyHatchStyle(hatch: GeologyHatch, color: string) {
  const { size, line, dots } = geologyHatches[hatch]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${line}" fill="none" stroke="#26313b" stroke-width=".75"/><path d="${dots}" fill="#26313b"/></svg>`
  return { backgroundColor: color, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }
}

type RockSymbol = { code: string; pattern: GeologyHatch; row: number; page: number }
/** Графа 5 таблицы 1. Широкие локальные категории без точного литотипа сюда не входят. */
export const columnRockSymbols: Readonly<Record<string, RockSymbol>> = {
  'Суглинок': { code: '89', pattern: 'loam-dash', row: 187, page: 19 },
  'Алевролит': { code: '6', pattern: 'silt-dash', row: 104, page: 13 },
  'Глина': { code: '7', pattern: 'clay-wave', row: 120, page: 14 },
  'Песок мелкозернистый': { code: '4', pattern: 'sand-fine', row: 52, page: 8 },
  'Песок среднезернистый': { code: '3', pattern: 'sand-medium', row: 35, page: 6 },
  'Известняк': { code: '85', pattern: 'limestone-brick', row: 183, page: 19 },
  'Гравий': { code: '1', pattern: 'gravel-rings', row: 4, page: 4 },
  'Мергель': { code: '95', pattern: 'marl-lines', row: 192, page: 20 },
}

/** Таблица 3, с. 22–23. Коды таблицы 3 имеют собственный контекст. */
export const gisPassportSymbols: Readonly<Record<string, Pick<RockSymbol, 'code' | 'pattern'>>> = {
  'Глина': { code: '7', pattern: 'clay-wave' },
  'Алевролит': { code: '6', pattern: 'silt-dash' },
  'Песок мелкозернистый': { code: '4', pattern: 'sand-fine' },
  'Песок среднезернистый': { code: '3', pattern: 'sand-medium' },
  'Песчаник': { code: '53', pattern: 'sandstone-bands' },
  'Гравий': { code: '101', pattern: 'gravel-rings' },
}

/** Таблица 6, с. 26. В текущем примере песок демонстрируется как среднезернистый. */
export const sectionRockSymbols = {
  sand: { name: 'Песок среднезернистый', code: '3', pattern: 'sand-medium', color: '#ffffff' },
  silt: { name: 'Алеврит', code: '7', pattern: 'silt-dash', color: '#eafbe2' },
  clay: { name: 'Глина', code: '7', pattern: 'silt-dash', color: '#eafbe2' },
} as const

/** Таблица 9, с. 33. Две согласованные по образцу и числу ячейки для примера паспорта. */
export const passportOreColors = {
  mk1: '#ff0000', // Первый мынкудукский, 16711680.
  mk2: '#ff4040', // Второй мынкудукский, 16728128.
} as const

/** Таблица 8, с. 32. RGB и десятичный код хранятся отдельно: отдельные пары расходятся. */
export const geochemistryColors = [
  ['Коричневые', '#f1dcb3', '15785139', '#ffecd4', '16772308'],
  ['Желтовато-серые и палевые', '#e6da94', '15129236', '#e3dfbc', '14933948'],
  ['Жёлто-бурые', '#eaaa7a', '15379066', '#e9d2c1', '15323841'],
  ['Желтоцветы', '#ffff3c', '16777020', '#ffffbe', '16777140'],
  ['Технологическое окисление', '#ecffc9', '15531977', '#f1ffe1', '15859681'],
  ['Красноцветы окисленные', '#ff7941', '16677185', '#fbac94', '16493716'],
  ['Красноцветы', '#ff9595', '16749973', '#ffd0d0', '16765136'],
  ['Пестроцветы', '#ffc4ff', '16762111', '#ffe0ff', '16769279'],
  ['Белесово-жёлтые окисленные', '#ffffbe', '16777150', '#ffffda', '16777178'],
  ['Белые', '#ffffef', '16777199', '#ffffef', '16777199'],
  ['Белесые', '#dbf1f9', '14414329', '#eaf8ff', '15398911'],
  ['Зеленовато-серые', '#96a78f', '9873295', '#b8cdb0', '12111280'],
  ['Серо-зелёные', '#85ad89', '8760713', '#a3d4a7', '10736807'],
  ['Жёлто-зелёные', '#dce087', '14475399', '#dedfbc', '14606268'],
  ['Зелёные', '#acddbc', '11328956', '#d5e9dc', '14019036'],
  ['Первично серые', '#c5c5c5', '12961221', '#e0e0e0', '14737632'],
  ['Бурые и красно-бурые', '#eca178', '15507832', '#f6cbb3', '16108725'],
  ['Темноцветы углистые', '#5c5c5c', '6052956', '#909090', '9474192'],
] as const

export function geochemistryColor(code: string | undefined): string | undefined {
  const value = code?.trim().toLowerCase()
  if (!value) return
  const color = (key: string) => geochemistryColors.flatMap(([, core, coreCode, logging, loggingCode]) =>
    [core === key || coreCode === key ? core : undefined, logging === key || loggingCode === key ? logging : undefined],
  ).find(Boolean)
  return color(value) ?? (/^\d+9$/.test(value) ? color(value.slice(0, -1)) : undefined)
}

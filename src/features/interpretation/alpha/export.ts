import { ALPHA_CALC_VERSION } from '../../../entities/interpretation/model/alphaVersion'
import type { AlphaDocument, AlphaPage } from '../../../entities/interpretation/model/alphaTypes'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { stocksByLft, totalsByCategory, zadrSummary, zoneSummary } from '../../../entities/interpretation/lib/alphaGammaReports'
import { gammaRowStatistics } from '../../../entities/interpretation/lib/alphaGammaProfile'
import { controlSummary } from '../../../entities/interpretation/lib/alphaControls'
import { loadAlphaViews } from './viewPreferences'

export function alphaExport(well: InterpretationWell, doc: AlphaDocument) {
  const actual = doc.current.rows.find(r => r.id === 'actual-filter')
  return { format: 'kapgeo-alpha-prototype-1', synthetic: true, calculationProfile: ALPHA_CALC_VERSION, well: { id: well.id, code: well.code, depth: well.depth }, records: allAlphaRecords(well, doc), document: doc,
    presentation: loadAlphaViews(well.id), controlSummary: controlSummary(doc.controls.rows),
    gammaSummaries: { categories: totalsByCategory(doc), lft: stocksByLft(doc), zadr: zadrSummary(doc, well.depth), proposedFilter: zoneSummary(doc, doc.filterProposal), actualFilter: actual ? zoneSummary(doc, actual) : null } }
}
export function resultCsv(well: InterpretationWell, doc: AlphaDocument, page: AlphaPage, sub: string) {
  const rows = page === 'gamma' && sub === 'oxidation' ? doc.oxidation : page === 'gamma' ? doc.gamma.rows.map(r => gammaRowStatistics(r, doc.parameters.gamma.density)) : page === 'thermal' && sub === 'induction' ? doc.metal.rows : page === 'thermal' && sub === 'projects' ? doc.projects : ['electro', 'current', 'thermal', 'caliper', 'flow', 'controls'].includes(page) ? doc[page as 'gamma'].rows : []
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))]
  return tableCsv(['well', 'method', ...keys], rows.map(row => [well.code, `${page}/${sub}`, ...keys.map(k => (row as unknown as Record<string, unknown>)[k] ?? '')]))
}
export function tableCsv(headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => { const text = value === null || value === undefined ? '' : typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : String(value); return `"${text.replaceAll('"', '""')}"` }
  return '\ufeff' + [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n')
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function svgToJpeg(source: string, widthMm = 297, heightMm = 420) {
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image(); image.src = url; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = Math.round(widthMm * 300 / 25.4); canvas.height = Math.round(heightMm * 300 / 25.4)
    const context = canvas.getContext('2d'); if (!context) throw new Error('Браузер не поддерживает растровый экспорт.')
    context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось подготовить JPEG.')), 'image/jpeg', 0.95))
  } finally { URL.revokeObjectURL(url) }
}

import type { GeologySection, SectionDrawing } from '../model/types'
import { profileLength } from './profile'
import { layerAnchors } from './correlation'
export function drawingTable(section: GeologySection, drawing: SectionDrawing) {
  const layers = (['ore', 'uncorrected', 'offbalance'] as const).filter(layer => drawing.layers.includes(layer)), layer=layers[0]
  const anchors = drawing.oreParameters===false ? [] : layers.flatMap(layer=>layerAnchors(section,layer).filter(a=>!section.auxiliary?.some(aux=>a.id.endsWith(`/${aux.id}`))).map(a=>({...a,source:layer})))
  let line = 1
  const rows = section.wellIds.filter(id=>!drawing.wellIds||drawing.wellIds.includes(id)).map(wellId => {
    const intervals = anchors.filter(a => a.wellId === wellId).map(a => `${layers.length>1?({ore:'ОРИ',uncorrected:'БП',offbalance:'ЗБ'}[a.source]+': '):''}${a.from.toFixed(1)}–${a.to.toFixed(1)}`)
    const labels = Array.from({ length: Math.max(1, Math.ceil(intervals.length / 2)) }, (_, i) => intervals.slice(i * 2, i * 2 + 2).join('; ') || '—')
    const row = { wellId, labels, line }; line += labels.length; return row
  })
  return { layer, rows, lineCount: line - 1 }
}
export function newDrawing(section: GeologySection, id: string): SectionDrawing {
  return { id, name: `Чертёж ${section.drawings.length + 1}`, horizontalScale: 2000, verticalScale: 500, left: 0, right: profileLength(section.profile), top: section.top, bottom: section.bottom, planHeight: 35, paper: 'A3', landscape: true, margin: 10, layers: ['technology', 'ore', 'lithology', 'oxidation', 'foundation', 'fault'], description: '' }
}
export function drawingLayout(d: SectionDrawing, wellCount = 0) {
  const [short, long] = d.paper === 'A3' ? [297, 420] : [210, 297]
  const width = d.landscape ? long! : short!, height = d.landscape ? short! : long!
  const graphWidth = (d.right - d.left) * 1000 / d.horizontalScale + 8.4
  const graphHeight = (d.top - d.bottom) * 1000 / d.verticalScale + 8.4
  const contentWidth = Math.max(140, graphWidth)
  const contentHeight = graphHeight + d.planHeight + (d.separator??0) + 6 + (d.bottomField??26) + (d.legend?((d.legendSize??3)+5):0) + wellCount * 4
  const availableWidth = width - 2 * d.margin, availableHeight = height - 2 * d.margin - 12
  const overlap = d.overlap ?? 0, strideX = availableWidth - overlap, strideY = availableHeight - overlap
  if (![width, height, graphWidth, graphHeight, contentWidth, contentHeight, availableWidth, availableHeight].every(Number.isFinite) || graphWidth <= 8.4 || graphHeight <= 8.4 || contentHeight <= 24 || availableWidth <= 0 || availableHeight <= 0) throw new Error('Некорректные размеры чертежа.')
  if (!Number.isFinite(overlap) || overlap < 0 || overlap > 20 || strideX <= 0 || strideY <= 0) throw new Error('Нахлёст должен составлять 0–20 мм и быть меньше рабочей области листа.')
  const columns = Math.max(1, Math.ceil((contentWidth - overlap) / strideX)), rows = Math.max(1, Math.ceil((contentHeight - overlap) / strideY))
  if (rows * columns > 100) throw new Error('Получается более 100 листов. Уменьшите диапазон или увеличьте знаменатель масштаба.')
  const offsetX = d.center ? Math.max(0, (availableWidth - contentWidth) / 2) : 0, offsetY = d.center ? Math.max(0, (availableHeight - contentHeight) / 2) : 0
  return { width, height, contentWidth, contentHeight, graphWidth, graphHeight, availableWidth, availableHeight, strideX, strideY, rows, columns, offsetX, offsetY, pages: Array.from({ length: rows * columns }, (_, i) => {
    const row = d.pageOrder === 'columns' ? i % rows : Math.floor(i / columns), column = d.pageOrder === 'columns' ? Math.floor(i / rows) : i % columns
    return { index: i, row, column, originX: d.margin + offsetX - column * strideX, originY: d.margin + 12 + offsetY - row * strideY }
  }) }
}

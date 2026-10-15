import { describe, expect, it } from 'vitest'
import { initialSections } from '../model/fixtures'
import { referenceSection } from '../model/referenceSection'
import { drawingLayout, drawingTable, newDrawing } from './drawing'

describe('drawing options', () => {
  it('prints selected ore sources with layer prefixes and limits rows to selected wells', () => {
    const section = referenceSection(), base = section.drawings[1]!
    const drawing = { ...base, layers: ['ore', 'uncorrected'], wellIds: [section.wellIds[0]!, section.wellIds[1]!] }
    const table = drawingTable(section, drawing)
    expect(table.rows.map(row => row.wellId)).toEqual(drawing.wellIds)
    expect(table.rows.flatMap(row => row.labels).join(' ')).toMatch(/ОРИ:/)
    expect(table.rows.flatMap(row => row.labels).join(' ')).toMatch(/БП:/)
  })

  it('expands total layout height for separator, bottom field, and legend without changing graph width', () => {
    const section = initialSections()[0]!, base = newDrawing(section, 'd')
    const baseline = drawingLayout(base), expanded = drawingLayout({ ...base, separator: 20, bottomField: 60, legend: true, legendSize: 10 })
    expect(expanded.contentHeight).toBeGreaterThan(baseline.contentHeight)
    expect(expanded.graphWidth).toBe(baseline.graphWidth)
    expect(expanded.contentWidth).toBe(baseline.contentWidth)
  })
})

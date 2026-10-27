import { describe, expect, it } from 'vitest'
import { sectionMapInfo } from '../model/mapInfo'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'

describe('section MIF/MID', () => {
  it('exports paired geometry and attributes in the section plane', () => {
    const section = referenceSection()
    const result = sectionMapInfo(section)
    expect(result.mif).toContain('Charset "UTF-8"')
    expect(result.mif).toContain('CoordSys NonEarth Units "m"')
    expect(result.mid.trim().split('\n')).toHaveLength(result.count)
    expect(result.count).toBeGreaterThan(0)
    expect(result.mif.match(/^Pline /gm)).toHaveLength(result.count)
  })
})

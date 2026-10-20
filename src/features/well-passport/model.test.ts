import { afterEach, describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, PASSPORT_STORAGE_PREFIX, passportPages, passportWells } from './model'

afterEach(() => localStorage.clear())
describe('independent passport settings', () => {
  const well = passportWells[0]!
  it('stores different passport layouts per well and ignores other workspaces', () => {
    const settings = { ...defaultSettings(well), from: 445, to: 480, note: 'Проверить фильтр' }
    localStorage.setItem(PASSPORT_STORAGE_PREFIX + well.id, JSON.stringify(settings))
    localStorage.setItem('kapgeo.map.display.PS-101', JSON.stringify({ from: 0, to: 1 }))
    expect(loadSettings(well)).toEqual(settings)
    expect(loadSettings(passportWells[1]!)).toEqual(defaultSettings(passportWells[1]!))
  })
  it('recovers a usable document from invalid stored ranges and tracks', () => {
    for (const patch of [{ from: 500, to: 450 }, { to: well.depth + 1 }, { tracks: ['unknown-track'] }, { tracks: [] }, { scale: 0 }]) {
      localStorage.setItem(PASSPORT_STORAGE_PREFIX + well.id, JSON.stringify({ ...defaultSettings(well), ...patch }))
      expect(loadSettings(well)).toEqual(defaultSettings(well))
    }
  })
  it('paginates the full range continuously at the physical scale and preserves the last depth', () => {
    const settings = { ...defaultSettings(well), from: 0, to: well.depth, scale: 200 as const }, pages = passportPages(settings)
    expect(pages).toHaveLength(15)
    expect(pages[0]!.from).toBe(0)
    expect(pages.at(-1)!.to).toBe(well.depth)
    pages.forEach((page, i) => {
      expect((page.to - page.from) * 1000 / settings.scale).toBeLessThanOrEqual(180)
      if (i) expect(page.from).toBe(pages[i - 1]!.to)
    })
  })
})

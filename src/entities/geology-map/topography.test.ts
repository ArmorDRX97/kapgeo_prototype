import { describe, expect, it } from 'vitest'
import { fieldGeoreference, localToGeographic, localToMercator, mercatorToLocal, visibleTopoTiles } from './topography'

describe('topographic background in the local metre grid', () => {
  it('anchors the field near Budenovskoye and preserves local coordinates in both directions', () => {
    const geographic = localToGeographic(fieldGeoreference)
    expect(geographic.latitude).toBeCloseTo(44.75, 7)
    expect(geographic.longitude).toBeCloseTo(67.7, 7)
    const point = { x: 61003.25, y: 98234.61 }, restored = mercatorToLocal(localToMercator(point))
    expect(restored.x).toBeCloseTo(point.x, 6)
    expect(restored.y).toBeCloseTo(point.y, 6)
    expect(localToGeographic({ ...point, x: point.x + 1000 }).latitude).toBeGreaterThan(localToGeographic(point).latitude)
    expect(localToGeographic({ ...point, y: point.y + 1000 }).longitude).toBeGreaterThan(localToGeographic(point).longitude)
  })
  it('loads only viewport tiles, changes them on pan and caps source zoom at 17', () => {
    const camera = { x: 57500, y: 95200, scale: .3 }, size = { width: 1200, height: 700 }
    const tiles = visibleTopoTiles(camera, size)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.length).toBeLessThan(60)
    expect(tiles.every(t => t.x < size.width && t.x + t.side > 0 && t.y < size.height && t.y + t.side > 0)).toBe(true)
    expect(visibleTopoTiles({ ...camera, y: camera.y + 4000 }, size).map(t => t.id)).not.toEqual(tiles.map(t => t.id))
    expect(visibleTopoTiles({ ...camera, scale: 80 }, size).every(t => t.id.startsWith('17/'))).toBe(true)
    expect(tiles.every(t => t.url.startsWith('https://tile.opentopomap.org/'))).toBe(true)
  })
})

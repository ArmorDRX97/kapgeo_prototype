import { describe, expect, it } from 'vitest'
import { anchoredCenter, plotCamera } from './plotCamera'

const base = { left: 0, right: 400, top: 20, bottom: -80 }
describe('plot camera', () => {
  it('zooms coordinate ranges and clamps panning without changing the base', () => {
    expect(plotCamera(base, 1, 1)).toEqual(base)
    expect(plotCamera(base, 2, 1)).toEqual({ left: 100, right: 300, top: -5, bottom: -55 })
    expect(plotCamera(base, 2, 1, { x: -100, z: 500 })).toEqual({ left: 0, right: 200, top: 20, bottom: -30 })
    expect(base).toEqual({ left: 0, right: 400, top: 20, bottom: -80 })
  })
  it('keeps the world coordinate under the pointer on wheel zoom', () => {
    const center = anchoredCenter(base, 200, 50, .3, .6), camera = plotCamera(base, 2, 1, center)
    expect(camera.left + .3 * (camera.right - camera.left)).toBeCloseTo(120)
    expect(camera.top - .6 * (camera.top - camera.bottom)).toBeCloseTo(-40)
  })
  it('changes vertical exaggeration without changing horizontal coverage', () => {
    const camera = plotCamera(base, 2, 2)
    expect(camera.right - camera.left).toBe(200)
    expect(camera.top - camera.bottom).toBe(25)
  })
})

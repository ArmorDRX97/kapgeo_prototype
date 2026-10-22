import { describe, expect, it, vi } from 'vitest'
import { depositField } from './fieldScene'
import { paintWells } from './paintWells'

describe('well hover feedback', () => {
  it('slightly enlarges only the hovered well and shows its name at overview scale', () => {
    const well = depositField.objects.find(o => o.kind === 'well')!
    const at = well.parts[0]!.nodes[0]!
    const context = { scale: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn<(x: number, y: number, radius: number, start: number, end: number) => void>(), fill: vi.fn(), stroke: vi.fn(), strokeText: vi.fn(), fillText: vi.fn() }
    const canvas = { getContext: () => context } as unknown as HTMLCanvasElement
    const camera = { x: at.x, y: at.y, scale: .3 }, size = { width: 900, height: 700 }
    paintWells(canvas, [well], camera, size, undefined, true, false)
    expect(context.fillText).not.toHaveBeenCalled()
    context.arc.mockClear()
    paintWells(canvas, [well], camera, size, undefined, true, false, well.id)
    const radii = context.arc.mock.calls.map(args => args[2])
    expect(radii.some(r => Math.abs(r - 2.7 * 1.18) < .00001)).toBe(true)
    expect(context.fillText).toHaveBeenCalledWith(well.name, expect.any(Number), expect.any(Number))
    context.fillText.mockClear()
    paintWells(canvas, [well], camera, size, undefined, true, false)
    expect(context.fillText).not.toHaveBeenCalled()
  })
})

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WellLog, type TrackSpec } from '@kapgeo/geo-viz/wellog'
const track: TrackSpec = { id: 'record', title: 'КС', width: 200, curves: [{ id: 'curve', type: 'RS', name: 'КС', unit: 'Ом·м', scale: { min: 0, max: 100 }, data: { depths: [0, 100], values: [0, 100] } }], guides: [{ id: 'level', value: 50, scale: { min: 0, max: 100 }, label: 'Уровень', color: '#123456' }] }
describe('Alpha shared Canvas interaction contract', () => {
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    const ctx = new Proxy({ measureText: (text: string) => ({ width: text.length * 6 }) }, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => undefined, set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 }); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
  const geometry = () => {
    const canvas = screen.getByRole('img', { name: 'Track КС' }), body = canvas.parentElement!, scroll = body.parentElement!
    for (const node of [canvas, body]) Object.defineProperty(node, 'getBoundingClientRect', { value: () => ({ x: 60, left: 60, y: 64, top: 64, width: 200, height: 576, bottom: 640, right: 260 }) })
    return { canvas, body, scroll }
  }
  it('offers a keyboard cursor, context information and zoom independently from editing', () => {
    const context = vi.fn(), select = vi.fn(), range = vi.fn()
    render(<WellLog tracks={[track]} depthRange={[20, 60]} bounds={[0, 100]} height={640} onContextSelect={context} onTrackSelect={select} onDepthRangeChange={range} />)
    const { canvas } = geometry(); fireEvent.keyDown(canvas, { key: 'ArrowDown' }); fireEvent.keyDown(canvas, { key: 'F10', shiftKey: true })
    expect(context).toHaveBeenCalledWith({ trackId: 'record', depth: 40.1 })
    fireEvent.keyDown(canvas, { key: 'Enter' }); expect(select).toHaveBeenCalledWith({ trackId: 'record', depth: 40.1 })
    fireEvent.keyDown(canvas, { key: '+' }); expect(range.mock.calls.at(-1)![0][1] - range.mock.calls.at(-1)![0][0]).toBeCloseTo(32)
  })
  it('pans both axes and restores the camera on Escape without editing source data', () => {
    const range = vi.fn(), guide = vi.fn(), before = JSON.stringify(track)
    render(<WellLog tracks={[track]} depthRange={[20, 60]} bounds={[0, 100]} height={640} interactionMode="pan" onDepthRangeChange={range} onGuideChange={guide} />)
    const { canvas, body, scroll } = geometry(); scroll.scrollLeft = 50
    fireEvent.pointerDown(canvas, { button: 0, clientX: 160, clientY: 264 }); expect(body).not.toHaveClass('wellog__body--panning')
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 314 }); expect(scroll.scrollLeft).toBe(90); expect(body).toHaveClass('wellog__body--panning')
    fireEvent.keyDown(canvas, { key: 'Escape' }); expect(range).toHaveBeenLastCalledWith([20, 60]); expect(scroll.scrollLeft).toBe(50)
    fireEvent.pointerUp(canvas, { clientX: 120, clientY: 314 }); expect(guide).not.toHaveBeenCalled(); expect(JSON.stringify(track)).toBe(before)
  })
  it('prioritizes a guide over camera pan and commits once, with cancellation support', () => {
    const range = vi.fn(), guide = vi.fn()
    render(<WellLog tracks={[track]} depthRange={[20, 60]} bounds={[0, 100]} height={640} interactionMode="boundary" onDepthRangeChange={range} onGuideChange={guide} />)
    const { canvas } = geometry()
    fireEvent.pointerDown(canvas, { button: 0, clientX: 160, clientY: 264 }); fireEvent.pointerMove(canvas, { clientX: 170, clientY: 264 }); expect(guide).not.toHaveBeenCalled()
    fireEvent.pointerUp(canvas, { clientX: 180, clientY: 264 }); expect(guide).toHaveBeenCalledExactlyOnceWith('record', 'level', 'value', 60); expect(range).not.toHaveBeenCalled()
    fireEvent.pointerDown(canvas, { button: 0, clientX: 160, clientY: 264 }); fireEvent.pointerMove(canvas, { clientX: 180, clientY: 264 }); fireEvent.pointerCancel(canvas); fireEvent.pointerUp(canvas, { clientX: 180, clientY: 264 }); expect(guide).toHaveBeenCalledTimes(1)
  })
})

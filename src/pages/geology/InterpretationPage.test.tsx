import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interpretationWells } from '../../entities/interpretation/model/fixtures'
import { userPersonas } from '../../entities/session/model/personas'
import { InterpretationPage } from './InterpretationPage'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({ well: 'int-demo-01', mode: 'lithology' }),
  useNavigate: () => navigate,
  useBlocker: vi.fn(),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: interpretationWells[0]!.initial, error: null }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}))
vi.mock('../../entities/session/model/sessionContext', () => ({
  useSession: () => ({ persona: userPersonas.find(p => p.id === 'geo.ivanova') }),
}))

describe('interpretation in-place navigation', () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.stubGlobal('PointerEvent', MouseEvent)
    const ctx = new Proxy({ measureText: (value: string) => ({ width: value.length * 6 }) }, {
      get(target, key) { return key in target ? target[key as keyof typeof target] : () => undefined },
      set() { return true },
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { fn(0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('selects an interval on the actual Canvas without resetting document scroll', () => {
    render(<InterpretationPage />)
    const canvas = screen.getByRole('img', { name: 'Колонка По каротажу' })
    fireEvent.pointerDown(canvas, { button: 0, clientY: 160 })
    fireEvent.pointerUp(canvas, { button: 0, clientY: 160 })
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
      to: '/geology', replace: true, resetScroll: false,
      search: expect.objectContaining({ well: 'int-demo-01', selection: 'lithology:lit-3' }),
    }))
  })

  it('zooms the depth window with the wheel without resetting document scroll', () => {
    render(<InterpretationPage />)
    const canvas = screen.getByRole('img', { name: 'Колонка КС · основной' })
    fireEvent.wheel(canvas, { deltaY: 100, clientY: 200 })
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
      to: '/geology', replace: true, resetScroll: false,
      search: expect.objectContaining({ from: expect.any(Number), to: expect.any(Number) }),
    }))
    expect(navigate.mock.calls[0]![0].search.to).toBeGreaterThan(136)
  })
})

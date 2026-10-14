import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PlanWorkbench } from './PlanWorkbench'
import { emptyMap } from '../../entities/geology-map/fixtures'
import { userPersonas } from '../../entities/session/model/personas'
import { MAP_STORAGE_KEY } from '../../repository/demo/mapRepository'
const route = vi.hoisted(() => ({ shouldBlockFn: null as null | ((args: { current: { pathname: string; search: Record<string, unknown> }; next: { pathname: string; search: Record<string, unknown> } }) => boolean) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: (options: { shouldBlockFn: typeof route.shouldBlockFn }) => { route.shouldBlockFn = options.shouldBlockFn; return { status: 'idle', proceed: vi.fn(), reset: vi.fn() } } }))
describe('map workbench operation boundaries', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }); vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { f(0); return 0 }) })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('creates a line by exact coordinate input and does not guard its internal Apply selection', () => {
    const p = emptyMap('test', 'Plan'), onSearch = vi.fn((next: { selection?: string }) => {
      expect(route.shouldBlockFn!({ current: { pathname: '/geology/plans/test', search: {} }, next: { pathname: '/geology/plans/test', search: next } })).toBe(false)
    })
    render(<PlanWorkbench initial={p} persona={userPersonas[0]!} search={{}} onSearch={onSearch} onSaved={vi.fn()} onDeleted={vi.fn()} registry={null} registryOpen onRegistryToggle={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Построить на плане' }))
    fireEvent.click(screen.getByText(/Координаты точек/))
    fireEvent.change(screen.getByLabelText('X новой точки, м'), { target: { value: '60000' } }); fireEvent.change(screen.getByLabelText('Y новой точки, м'), { target: { value: '94000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить координату' }))
    fireEvent.change(screen.getByLabelText('Y новой точки, м'), { target: { value: '94100' } }); fireEvent.click(screen.getByRole('button', { name: 'Добавить координату' }))
    expect(screen.getByRole('button', { name: 'Сохранить план' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onSearch).toHaveBeenCalledOnce(); expect(screen.queryByText('Правки не применены')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить план' }))
    const saved = JSON.parse(localStorage.getItem(MAP_STORAGE_KEY)!).projects.find((d: { id: string }) => d.id === 'test')
    expect(saved.objects[0].parts[0].nodes.map((n: { x: number; y: number }) => [n.x, n.y])).toEqual([[60000, 94000], [60000, 94100]])
  })
  it('permits personal visibility in read-only without writing the document', () => {
    const p = emptyMap('test', 'Plan')
    render(<PlanWorkbench initial={p} persona={userPersonas.find(p => p.id === 'reserves.lee')!} search={{}} onSearch={vi.fn()} onSaved={vi.fn()} onDeleted={vi.fn()} registry={null} registryOpen onRegistryToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Построить на плане' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Видимость слоя Построения' }))
    expect(screen.getByText('Только просмотр')).toBeInTheDocument(); expect(localStorage.getItem(MAP_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Видимость слоя Построения' })).not.toBeChecked()
  })
})

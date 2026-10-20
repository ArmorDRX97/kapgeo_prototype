import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PlanWorkbench } from './PlanWorkbench'
import { emptyMap, initialMaps } from '../../entities/geology-map/fixtures'
import { userPersonas } from '../../entities/session/model/personas'
import { MAP_STORAGE_KEY } from '../../repository/demo/mapRepository'
const route = vi.hoisted(() => ({ shouldBlockFn: null as null | ((args: { current: { pathname: string; search: Record<string, unknown> }; next: { pathname: string; search: Record<string, unknown> } }) => boolean) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: (options: { shouldBlockFn: typeof route.shouldBlockFn }) => { route.shouldBlockFn = options.shouldBlockFn; return { status: 'idle', proceed: vi.fn(), reset: vi.fn() } } }))
describe('map workbench operation boundaries', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }); vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { f(0); return 0 }) })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('protects source geometry while allowing inspection and explicit well type edits',()=>{
    const p=initialMaps()[0]!,well=p.objects.find(o=>o.kind==='well')!
    render(<PlanWorkbench initial={p} persona={userPersonas[0]!} search={{selection:well.id}} onSearch={vi.fn()} onSaved={vi.fn()} onDeleted={vi.fn()} registry={null} registryOpen onRegistryToggle={vi.fn()} />)
    expect(screen.getByLabelText('Привязка')).toHaveValue('collar')
    for(const name of ['Переместить объект','Добавить точку','Удалить точку','Переместить подпись','Удалить объект']) expect(screen.getByRole('button',{name})).toBeDisabled()
    expect(screen.getByRole('combobox',{name:'Тип скважины'})).toBeEnabled()
    fireEvent.click(screen.getByText(/Координаты точек/))
    expect(screen.getByRole('spinbutton',{name:'X части 1 точки 1'})).toBeDisabled()
    expect(screen.getByRole('spinbutton',{name:'Y части 1 точки 2'})).toBeDisabled()
    expect(document.querySelector('[data-node]')).toBeNull()
  })
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
  it('opens display settings from the profile-menu action and saves them locally', () => {
    const p = emptyMap('display-test', 'Plan')
    render(<PlanWorkbench initial={p} persona={userPersonas[0]!} search={{}} onSearch={vi.fn()} onSaved={vi.fn()} onDeleted={vi.fn()} registry={null} registryOpen onRegistryToggle={vi.fn()} />)
    expect(screen.getByRole('region', { name: 'Условные обозначения плана' })).toBeInTheDocument()
    fireEvent(window, new Event('kapgeo:open-plan-display'))
    expect(screen.getByRole('heading', { name: 'Отображение плана' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Координатная сетка'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить отображение' }))
    expect(screen.queryByRole('heading', { name: 'Отображение плана' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('kapgeo.map.display.display-test')!)).toMatchObject({ grid: false })
    fireEvent(window, new Event('kapgeo:open-plan-display'))
    expect(screen.getByRole('heading', { name: 'Отображение плана' })).toBeInTheDocument()
    expect(screen.getByLabelText('Координатная сетка')).not.toBeChecked()
  })
  it('explains the map object drawing flow in the help dialog', () => {
    render(<PlanWorkbench initial={emptyMap('help-test', 'Plan')} persona={userPersonas[0]!} search={{}} onSearch={vi.fn()} onSaved={vi.fn()} onDeleted={vi.fn()} registry={null} registryOpen onRegistryToggle={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Как работать' }))
    expect(screen.getByRole('heading', { name: 'Как работать с планом' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog', { name: 'Как работать с планом' })).getByText('Создать объект')).toBeInTheDocument()
    expect(screen.getByText(/Выберите слой и тип объекта в правой панели/)).toBeInTheDocument()
    expect(screen.getByText(/Нажмите «Завершить ввод».*«Применить»/)).toBeInTheDocument()
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

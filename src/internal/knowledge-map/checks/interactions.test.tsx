import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { Search } from '../features/search/Search'
import { LearningBar } from '../features/learning/Learning'
import { PathExplorer } from '../features/path/PathExplorer'
import { DetailPanel } from '../widgets/explanations/DetailPanel'
import { knowledge } from '../entities/knowledge/model'

beforeAll(() => {
  // jsdom does not implement the browser's top-layer dialog API.
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

describe('Accessible learning interactions', () => {
  it('searches with the keyboard and opens the chosen item', () => {
    const onOpen = vi.fn()
    render(<Search index={knowledge} onOpen={onOpen} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'каротаж' } })
    expect(screen.getByRole('listbox')).toBeVisible()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('logging')
    expect(input).toHaveValue('')
  })
  it('moves through guided stages and completes only from the final stage', () => {
    const path = knowledge.learningPaths[0]!, onStep = vi.fn(), onComplete = vi.fn()
    const props = { path, onStep, onComplete, onPause: vi.fn() }
    const view = render(<LearningBar {...props} step={0} />)
    expect(screen.getByRole('button', { name: 'Предыдущий этап' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(onStep).toHaveBeenCalledWith(1)
    expect(onComplete).not.toHaveBeenCalled()
    view.rerender(<LearningBar {...props} step={path.steps.length - 1} />)
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }))
    expect(onComplete).toHaveBeenCalledOnce()
  })
  it('explains a real path and has an honest no-path result', () => {
    const props = { index: knowledge, onChange: vi.fn(), onShow: vi.fn(), onClose: vi.fn(), onOpen: vi.fn() }
    const view = render(<PathExplorer {...props} value={{ from: 'logging', to: 'composite-data', direction: 'flow' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Показать путь' }))
    expect(screen.getByText(/Найден путь:/)).toBeVisible()
    expect(props.onShow).toHaveBeenCalledWith(expect.objectContaining({ nodeIds: expect.arrayContaining(['logging', 'log-curves', 'composite-data']) }))
    view.rerender(<PathExplorer {...props} value={{ from: 'logging', to: 'ai-suggestion', direction: 'flow' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Показать путь' }))
    expect(screen.getByText('Осмысленный путь не найден')).toBeVisible()
  })
  it('shows all nine explanation sections and navigates through meaningful relations', () => {
    const onOpen = vi.fn()
    render(<DetailPanel node={knowledge.byId.get('logging')!} index={knowledge} pinned={false} focused={false} onOpen={onOpen} onClose={vi.fn()} onPin={vi.fn()} onFocus={vi.fn()} onPath={vi.fn()} onShare={vi.fn()} />)
    const panel = screen.getByRole('complementary')
    for (const heading of ['Что это?', 'Зачем нужно?', 'Как работает?', 'Кто участвует?', 'Что требуется на входе?', 'Что получается на выходе?', 'Что происходит дальше?', 'Пример из практики']) expect(within(panel).getByRole('heading', { name: heading })).toBeVisible()
    expect(within(panel).getByRole('heading', { name: /С чем связано/ })).toBeVisible()
    fireEvent.click(within(panel).getByRole('button', { name: /Каротажные кривые/ }))
    expect(onOpen).toHaveBeenCalledWith('log-curves')
  })
})

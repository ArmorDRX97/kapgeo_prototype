import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KnowledgeMapPage } from './KnowledgeMapPage'
import { KNOWLEDGE_BRIDGE } from '../../internal/knowledge-map/integration/protocol'

const context = vi.hoisted(() => ({ search: { mode: 'data' as const, node: 'logging', from: '/geology/bgd/DEP-SARYTAU?section=sites' }, navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ getRouteApi: () => ({ useSearch: () => context.search }), useNavigate: () => context.navigate }))
vi.mock('../../entities/session/model/sessionContext', () => ({ useSession: () => ({ persona: { homeRoute: '/geology/bgd' } }) }))
afterEach(() => { cleanup(); context.navigate.mockReset(); vi.useRealTimers() })

function message(frame: HTMLIFrameElement, type: string, extra = {}, source = frame.contentWindow, origin = window.location.origin) {
  act(() => { window.dispatchEvent(new MessageEvent('message', { source, origin, data: { channel: KNOWLEDGE_BRIDGE, type, ...extra } })) })
}

describe('Team-only knowledge tool host', () => {
  it('isolates the document, validates messages, preserves the iframe and returns to the original product context', () => {
    render(<KnowledgeMapPage />)
    const frame = screen.getByTitle('Карта взаимосвязей KAPGEO — инструмент команды') as HTMLIFrameElement
    const originalSrc = frame.src
    expect(frame).toHaveAttribute('src', '/internal/knowledge-map.html#mode=data&node=logging')
    expect(screen.getByText(/вне дизайна прототипа/)).toBeInTheDocument()
    message(frame, 'ready', {}, window)
    expect(screen.getByRole('status')).toBeInTheDocument()
    message(frame, 'ready', {}, frame.contentWindow, 'https://outside.test')
    expect(screen.getByRole('status')).toBeInTheDocument()
    message(frame, 'ready')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    message(frame, 'context', { context: { mode: 'specialists', node: 'geologist' } })
    expect(context.navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/team/knowledge-map', replace: true, search: { ...context.search, mode: 'specialists', node: 'geologist' } }))
    expect(frame.src).toBe(originalSrc)
    fireEvent.click(screen.getByRole('button', { name: 'В прототип' }))
    expect(context.navigate).toHaveBeenLastCalledWith({ href: context.search.from })
  })
  it('explains a failed load and retries the isolated document', () => {
    vi.useFakeTimers()
    render(<KnowledgeMapPage />)
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.getByRole('alert')).toHaveTextContent('Карта не загрузилась')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }))
    expect(screen.getByRole('status')).toHaveTextContent('Открываем карту')
    expect(screen.getByTitle('Карта взаимосвязей KAPGEO — инструмент команды')).toHaveAttribute('src', expect.stringContaining('?retry='))
  })
})

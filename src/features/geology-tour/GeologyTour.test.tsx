import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeologyTour } from './GeologyTour'
import { buildCurrentGeologyPageTour, resolveTourTarget } from './model/runtime'
import { geologyTourDefinitions } from './model/catalog'

const saveProgress = vi.fn(async (_personaId: string, next: Record<string, unknown>) => ({
  id: 'tour:geology:geo.ivanova',
  personaId: 'geo.ivanova',
  ...next,
  updatedAt: '2026-08-25T12:00:00.000Z',
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) => select({ location: { pathname: '/geology', search: {}, searchStr: '', href: '/geology' } }),
}))

vi.mock('../../entities/session/model/sessionContext', () => ({
  useSession: () => ({ persona: { id: 'geo.ivanova', roles: ['R1'], name: 'Ирина Иванова' } }),
}))

vi.mock('../../repository/api', () => ({
  fetchGeologyTourProgress: async () => ({ id: 'tour:geology:geo.ivanova', personaId: 'geo.ivanova', stepIndex: 0, completedTourIds: [], launcherSeen: false, updatedAt: '2026-08-25T00:00:00.000Z' }),
  saveGeologyTourProgress: (...args: unknown[]) => saveProgress(args[0] as string, args[1] as Record<string, unknown>),
}))

describe('GeologyTour', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="main-content"><header class="page-header"><h1>Геология месторождения</h1></header><section class="panel"><h2 class="panel__title">Скважины и качество данных</h2><p class="panel__description">Карта объектов.</p></section></main><button class="context-selector">Контекст</button>'
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 20, y: 20, top: 20, left: 20, right: 320, bottom: 100, width: 300, height: 80, toJSON: () => ({}) })
    HTMLElement.prototype.scrollIntoView = vi.fn()
    saveProgress.mockClear()
  })

  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('opens the fixed launcher menu and starts the complete excursion', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><GeologyTour /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Открыть экскурсию по геологическому модулю' }))
    expect(screen.getByText('Выберите маршрут обучения')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Полная экскурсия по геологии/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByText('Рабочий контекст')).toBeInTheDocument()
    await waitFor(() => expect(saveProgress).toHaveBeenCalledWith('geo.ivanova', expect.objectContaining({ activeTourId: 'geology-complete', stepIndex: 0 })))
  })

  it('builds an automatic tour from visible areas of a current or future geology page', () => {
    const tour = buildCurrentGeologyPageTour('/geology')!
    expect(tour.steps.map((step) => step.title)).toEqual(expect.arrayContaining(['Геология месторождения', 'Скважины и качество данных']))
    expect(resolveTourTarget(tour.steps[0]!)).toBeInstanceOf(HTMLElement)
  })

  it('catalog keeps the launcher useful for a complete and thematic journey', () => {
    expect(geologyTourDefinitions.map((tour) => tour.id)).toEqual(expect.arrayContaining(['geology-complete', 'geology-well', 'geology-logs', 'geology-projects']))
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import type { VersionHistory } from '../../../repository/contracts/geology'
import { WellAuditWorkspace } from './WellAuditWorkspace'

type MockScienceState = {
  jobs: Array<Record<string, unknown>>
  auditEvents: Array<Record<string, unknown>>
  isLoading: boolean
}

const mockedScienceState: MockScienceState = {
  jobs: [],
  auditEvents: [],
  isLoading: false,
}

vi.mock('../../../features/scientific-jobs', () => ({
  useScientificJobs: () => ({
    jobs: mockedScienceState.jobs,
    auditLog: {
      query: () => mockedScienceState.auditEvents,
    },
    isLoading: mockedScienceState.isLoading,
  }),
}))

function renderAuditWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <WellAuditWorkspace well={primaryWell} />
    </QueryClientProvider>,
  )
}

function setScienceState(state: Partial<MockScienceState>) {
  mockedScienceState.jobs = state.jobs ?? []
  mockedScienceState.auditEvents = state.auditEvents ?? []
  mockedScienceState.isLoading = state.isLoading ?? false
}

const baseHistory: VersionHistory = {
  passport: [
    {
      id: 'WELL-PASSPORT-WELL-1010-FULL-V12',
      objectId: 'WELL-PASSPORT-WELL-1010-FULL',
      version: 12,
      status: 'published',
      createdAt: '2026-08-20T08:00:00.000Z',
      createdBy: { id: 'PERSON-R1-GEOLOGIST', name: 'Айгерим Садыкова · synthetic' },
      reason: 'Исходный паспорт',
      data: {
        purpose: primaryWell.purpose,
        profile: primaryWell.profile,
        location: {
          type: 'Point',
          crs: {
            id: primaryWell.crs,
            authority: 'EPSG',
            code: '32642',
            name: 'WGS 84 / UTM zone 42N',
            kind: 'projected',
            axisOrder: 'xy',
            unit: 'm',
          },
          coordinates: [primaryWell.coordinates.x, primaryWell.coordinates.y],
        },
        depth: primaryWell.depth,
        casingDiameter: primaryWell.casingDiameter,
      },
      quality: { state: 'valid', issueCount: 0 },
      dependencies: [],
      contentHash: 'p-12',
    },
  ],
  construction: [
    {
      id: 'WELL-CONSTRUCTION-WELL-1010-FULL-V12',
      objectId: 'WELL-CONSTRUCTION-WELL-1010-FULL',
      version: 12,
      status: 'published',
      createdAt: '2026-08-20T08:00:00.000Z',
      createdBy: { id: 'PERSON-R1-GEOLOGIST', name: 'Айгерим Садыкова · synthetic' },
      reason: 'Исходная конструкция',
      data: { intervals: [] },
      quality: { state: 'valid', issueCount: 0 },
      dependencies: [],
      contentHash: 'c-12',
    },
  ],
}

vi.mock('../../../repository/api', () => ({
  fetchWellPassportHistory: async () => baseHistory,
  fetchDemoAuditEvents: async () => [],
}))

describe('WellAuditWorkspace', () => {
  afterEach(() => {
    mockedScienceState.jobs = []
    mockedScienceState.auditEvents = []
    mockedScienceState.isLoading = false
  })

  beforeEach(() => {
    setScienceState({ jobs: [], auditEvents: [], isLoading: false })
  })

  it('shows loading when any required source is pending', async () => {
    setScienceState({ isLoading: true })
    renderAuditWorkspace()

    expect(await screen.findByText('Загружаем журнал аудита скважины…')).toBeInTheDocument()
  })

  it('renders version history and empty science timeline', async () => {
    renderAuditWorkspace()

    expect((await screen.findAllByText(/Версия паспорта v12/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Версия конструкции v12/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('События по связанным scientific jobs не найдены.').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Аудит содержит 2 записей/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Задач: 0/).length).toBeGreaterThan(0)
  })

  it('renders science job events in the audit timeline and summary', async () => {
    setScienceState({
      jobs: [
        {
          id: 'WELL-1010-FULL-job-1',
          type: 'file_import',
          label: 'Сбор входных данных',
          state: 'succeeded',
          stage: 'Завершено',
          progressMode: 'determinate',
          progress: { completed: 100, total: 100, unit: 'шагов' },
          inputSnapshotId: primaryWell.id,
          component: { id: 'science/import', version: '1.0.0' },
          createdBy: { id: 'person-audit', name: 'Сервисный оператор' },
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
          attempt: 1,
          parentJobId: undefined,
          resultRefs: [{ id: 'R1', type: 'dataset', label: 'Результат импорта', route: '/results/1', checksum: 'sha' }],
          diagnostics: [],
          history: [],
        } satisfies Record<string, unknown>,
      ],
      auditEvents: [
        {
          id: 'AUD-001',
          eventType: 'science.job.finished',
          entityType: 'science_job',
          entityId: 'WELL-1010-FULL-job-1',
          actor: { id: 'person-audit', type: 'user', name: 'Сервисный оператор', scope: 'Геология' },
          requestId: 'log-import:WELL-1010-FULL:run-1',
          occurredAt: '2026-08-20T10:05:00.000Z',
          status: 'accepted',
          payload: {
            environment: { route: '/science/jobs/WELL-1010-FULL-job-1' },
            progress: { percent: 100, message: 'Импорт завершен' },
            resultRef: { kind: 'dataset', id: 'R1', path: '/results/1' },
            metadata: { source: 'manual' },
          },
        } satisfies Record<string, unknown>,
      ] as Array<Record<string, unknown>>,
    })

    renderAuditWorkspace()

    expect((await screen.findAllByText('Задача завершена')).length).toBeGreaterThan(1)
    expect(
      screen.getAllByText(
        (content) =>
          content.includes('100%') &&
          content.includes('Результат:') &&
          content.includes('/results/1'),
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/Запрос log-import:WELL-1010-FULL:run-1/)).toBeInTheDocument()
    expect(screen.getAllByText(/Аудит содержит 3 записей/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Задач: 1/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Сервисный оператор/).length).toBeGreaterThan(0)
  })
})

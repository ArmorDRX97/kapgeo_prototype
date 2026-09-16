import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeoBasePage } from './GeoBasePage'
import { fetchGeologicalMasterData, fetchPlatformPreferences } from '../../repository/api'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../../repository/api', () => ({
  fetchGeologicalMasterData: vi.fn(),
  fetchPlatformPreferences: vi.fn(),
}))

const mockedMaster = vi.mocked(fetchGeologicalMasterData)
const mockedPreferences = vi.mocked(fetchPlatformPreferences)

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><GeoBasePage /></QueryClientProvider>)
}

describe('GeoBasePage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens the overview of the current visible deposit', async () => {
    mockedMaster.mockResolvedValue({
      deposits: [
        { id: 'DEP-ONE', isHidden: false },
        { id: 'DEP-TWO', isHidden: false },
      ],
    } as Awaited<ReturnType<typeof fetchGeologicalMasterData>>)
    mockedPreferences.mockResolvedValue({ currentDepositId: 'DEP-TWO' } as Awaited<ReturnType<typeof fetchPlatformPreferences>>)

    renderPage()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({
      to: '/geology/bgd/$depositId',
      params: { depositId: 'DEP-TWO' },
      search: { section: undefined },
      replace: true,
    }))
  })

  it('shows an empty state when there are no visible deposits', async () => {
    mockedMaster.mockResolvedValue({ deposits: [] } as unknown as Awaited<ReturnType<typeof fetchGeologicalMasterData>>)
    mockedPreferences.mockResolvedValue({ currentDepositId: 'DEP-ONE' } as Awaited<ReturnType<typeof fetchPlatformPreferences>>)

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Нет доступных месторождений' })).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})

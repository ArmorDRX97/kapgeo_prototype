import { GeologyRepositoryError, type DependencyImpact, type SaveWellPassportCommand, type SaveWellPassportResult, type VersionHistory, type WellPassportRepository, type WellPassportWorkspace } from '../contracts/geology'

type ApiEnvelope<T> = { data: T; meta: { requestId: string; serverTime: string } }

export class HttpWellPassportRepository implements WellPassportRepository {
  constructor(private readonly baseUrl: string) {}

  getWorkspace(wellId: string): Promise<WellPassportWorkspace> {
    return this.request<WellPassportWorkspace>(`/wells/${wellId}/passport-workspace`)
  }

  previewImpact(wellId: string, passport: SaveWellPassportCommand['passport'], construction: SaveWellPassportCommand['construction']): Promise<DependencyImpact[]> {
    return this.request<DependencyImpact[]>(`/wells/${wellId}/passport-impact`, {
      method: 'POST',
      body: JSON.stringify({ passport, construction }),
    })
  }

  save(command: SaveWellPassportCommand): Promise<SaveWellPassportResult> {
    return this.request<SaveWellPassportResult>(`/wells/${command.wellId}/passport-versions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': command.idempotencyKey },
      body: JSON.stringify(command),
    })
  }

  getHistory(wellId: string): Promise<VersionHistory> {
    return this.request<VersionHistory>(`/wells/${wellId}/passport-versions`)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    const payload = await response.json() as ApiEnvelope<T> | { code?: string; detail?: string; currentVersion?: number }
    if (!response.ok) {
      const problem = payload as { code?: string; detail?: string; currentVersion?: number }
      throw new GeologyRepositoryError(
        problem.code === 'VERSION_CONFLICT' ? 'VERSION_CONFLICT' : 'VALIDATION_ERROR',
        problem.detail ?? 'Не удалось выполнить команду геологического репозитория.',
        { currentVersion: problem.currentVersion },
      )
    }
    return (payload as ApiEnvelope<T>).data
  }
}

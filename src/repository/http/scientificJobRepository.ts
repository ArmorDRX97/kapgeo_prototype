import type { CreateScientificJobInput, ScientificJob } from '../../shared/scientific/jobs'
import { ScientificJobRepositoryError, type ScientificJobRepository } from '../contracts/scientificJobs'

type ApiEnvelope<T> = { data: T; meta: { requestId: string; serverTime: string } }

export class HttpScientificJobRepository implements ScientificJobRepository {
  constructor(private readonly baseUrl: string) {}

  list(): Promise<ScientificJob[]> { return this.request('/scientific-jobs') }
  get(jobId: string): Promise<ScientificJob> { return this.request(`/scientific-jobs/${jobId}`) }
  create(input: CreateScientificJobInput, idempotencyKey: string): Promise<ScientificJob> {
    return this.request('/scientific-jobs', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) })
  }
  poll(jobId: string): Promise<ScientificJob> { return this.get(jobId) }
  cancel(jobId: string, reason?: string): Promise<ScientificJob> {
    return this.request(`/scientific-jobs/${jobId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
  }
  retry(jobId: string): Promise<ScientificJob> { return this.request(`/scientific-jobs/${jobId}/retry`, { method: 'POST' }) }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
    const payload = await response.json() as ApiEnvelope<T> | { code?: string; detail?: string }
    if (!response.ok) {
      const problem = payload as { code?: string; detail?: string }
      throw new ScientificJobRepositoryError(problem.code === 'JOB_NOT_FOUND' ? 'JOB_NOT_FOUND' : 'JOB_COMMAND_REJECTED', problem.detail ?? 'Не удалось выполнить команду scientific job.')
    }
    return (payload as ApiEnvelope<T>).data
  }
}

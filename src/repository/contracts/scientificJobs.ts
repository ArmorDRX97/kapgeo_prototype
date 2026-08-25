import type { CreateScientificJobInput, ScientificJob } from '../../shared/scientific/jobs'

export type ScientificJobRepositoryErrorCode = 'JOB_NOT_FOUND' | 'JOB_COMMAND_REJECTED'

export class ScientificJobRepositoryError extends Error {
  constructor(public readonly code: ScientificJobRepositoryErrorCode, message: string) {
    super(message)
    this.name = 'ScientificJobRepositoryError'
  }
}

export interface ScientificJobRepository {
  list(): Promise<ScientificJob[]>
  get(jobId: string): Promise<ScientificJob>
  create(input: CreateScientificJobInput, idempotencyKey: string): Promise<ScientificJob>
  poll(jobId: string): Promise<ScientificJob>
  cancel(jobId: string, reason?: string): Promise<ScientificJob>
  retry(jobId: string): Promise<ScientificJob>
}

import type { CreateScientificJobInput, JobDiagnostic, ScientificJob } from '../../shared/scientific/jobs'
import {
  applyScientificJobCommand,
  createScientificJob,
  retryScientificJob as createRetryScientificJob,
  ScientificJobError,
} from '../../shared/scientific/jobs'
import { ScientificJobRepositoryError, type ScientificJobRepository } from '../contracts/scientificJobs'
import { demoDatabase, type DemoRecord } from './demoDatabase'

type PollStep = 0 | 1 | 2 | 3 | 4

type Command =
  | { type: 'start'; stage: string }
  | { type: 'report_progress'; stage: string; completed?: number; diagnostics?: JobDiagnostic[] }
  | { type: 'begin_post_processing'; stage: string }
  | { type: 'succeed'; stage: string; resultRefs?: ScientificJob['resultRefs'] }
  | { type: 'cancel'; reason?: string }

const initialTimestamp = Date.UTC(2026, 7, 20, 9, 0, 0)

export class DemoScientificJobRepository implements ScientificJobRepository {
  private readonly records = new Map<string, ScientificJob>()
  private readonly pollStep = new Map<string, PollStep>()
  private readonly idempotency = new Map<string, string>()
  private readonly retryBySource = new Map<string, string>()
  private sequence = 0

  async list(): Promise<ScientificJob[]> {
    await this.hydrate()
    return [...this.records.values()]
      .map((job) => structuredClone(job))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async get(jobId: string): Promise<ScientificJob> {
    await this.hydrate()
    const job = this.records.get(jobId)
    if (!job) {
      throw new ScientificJobRepositoryError('JOB_NOT_FOUND', `Задание ${jobId} не найдено.`)
    }
    return structuredClone(job)
  }

  async create(input: CreateScientificJobInput, idempotencyKey: string): Promise<ScientificJob> {
    await this.hydrate()
    const existingId = this.idempotency.get(idempotencyKey)
    if (existingId) {
      const existing = this.records.get(existingId)
      if (existing) {
        return structuredClone(existing)
      }
      this.idempotency.delete(idempotencyKey)
    }

    const job = this.createFreshJob(input, idempotencyKey)
    this.records.set(job.id, job)
    this.pollStep.set(job.id, 0)
    this.idempotency.set(idempotencyKey, job.id)
    await this.persist(job)
    return structuredClone(job)
  }

  async poll(jobId: string): Promise<ScientificJob> {
    await this.hydrate()
    const job = this.requireJob(jobId)
    const step = (this.pollStep.get(job.id) ?? 0) as PollStep
    const command = this.commandForPoll(job, step)
    if (!command) return structuredClone(job)

    const next = this.applyCommand(job, command)
    this.records.set(job.id, next)
    this.pollStep.set(next.id, Math.min(step + 1, 4) as PollStep)
    await this.persist(next)
    return structuredClone(next)
  }

  async cancel(jobId: string, reason?: string): Promise<ScientificJob> {
    await this.hydrate()
    const job = this.requireJob(jobId)
    if (!this.isActive(job.state)) {
      throw new ScientificJobRepositoryError('JOB_COMMAND_REJECTED', `Задание ${jobId} нельзя отменить из статуса ${job.state}.`)
    }
    const next = this.applyCommand(job, { type: 'cancel', reason })
    this.records.set(job.id, next)
    await this.persist(next)
    return structuredClone(next)
  }

  async retry(jobId: string): Promise<ScientificJob> {
    await this.hydrate()
    const job = this.requireJob(jobId)
    if (!this.canRetry(job)) {
      throw new ScientificJobRepositoryError('JOB_COMMAND_REJECTED', `Для задачи ${job.id} повтор невозможен.`)
    }

    const cachedId = this.retryBySource.get(job.id)
    if (cachedId) {
      const retryCached = this.records.get(cachedId)
      if (retryCached) return structuredClone(retryCached)
    }

    const result = createRetryScientificJob(job, this.buildRetryId(job.id, job.attempt + 1), this.timestamp())
    this.records.set(result.id, result)
    this.pollStep.set(result.id, 0)
    this.retryBySource.set(job.id, result.id)
    await this.persist(result)
    return structuredClone(result)
  }

  reset(): void {
    this.records.clear()
    this.pollStep.clear()
    this.idempotency.clear()
    this.retryBySource.clear()
    this.sequence = 0
    this.hydrated = false
  }

  private hydrated = false

  private async hydrate(): Promise<void> {
    if (this.hydrated || typeof indexedDB === 'undefined') return
    const [jobs, runtime] = await Promise.all([
      demoDatabase.getAll<ScientificJob>('jobs'),
      demoDatabase.get<DemoRecord<{ pollStep: Array<[string, PollStep]>; idempotency: Array<[string, string]>; retryBySource: Array<[string, string]>; sequence: number }>>('records', 'scientific-job-runtime'),
    ])
    for (const job of jobs) this.records.set(job.id, job)
    if (runtime) {
      this.pollStep.clear(); runtime.data.pollStep.forEach(([key, value]) => this.pollStep.set(key, value))
      this.idempotency.clear(); runtime.data.idempotency.forEach(([key, value]) => this.idempotency.set(key, value))
      this.retryBySource.clear(); runtime.data.retryBySource.forEach(([key, value]) => this.retryBySource.set(key, value))
      this.sequence = runtime.data.sequence
    }
    this.hydrated = true
  }

  private async persist(job: ScientificJob): Promise<void> {
    if (typeof indexedDB === 'undefined') return
    await demoDatabase.transaction(['jobs', 'records', 'auditEvents', 'artifacts'], async (transaction) => {
      await transaction.put('jobs', job)
      await transaction.put('records', {
        id: 'scientific-job-runtime', entityType: 'scientific-job-runtime', objectId: 'scientific-jobs', scopeId: 'demo', status: 'active', updatedAt: job.updatedAt,
        data: { pollStep: [...this.pollStep.entries()], idempotency: [...this.idempotency.entries()], retryBySource: [...this.retryBySource.entries()], sequence: this.sequence },
      } satisfies DemoRecord<unknown>)
      await transaction.put('auditEvents', {
        id: `AUD-${job.id}-${job.state}-${job.updatedAt}`, eventType: `science.job.${job.state === 'succeeded' ? 'finished' : job.state}`, entityType: 'science_job', entityId: job.id,
        actor: { id: job.createdBy.id, type: 'user', name: job.createdBy.name }, requestId: job.id, idempotencyKey: job.id, occurredAt: job.updatedAt,
        status: job.state === 'failed' ? 'failed' : 'accepted', payload: { metadata: { state: job.state, stage: job.stage, inputSnapshotId: job.inputSnapshotId } },
      })
      if (job.state === 'succeeded') {
        for (const artifact of job.resultRefs) {
          await transaction.put('artifacts', { ...artifact, id: 'artifact:' + job.id + ':' + artifact.id, jobId: job.id, objectId: job.inputSnapshotId, createdAt: job.updatedAt })
        }
      }
    })
  }
  private requireJob(jobId: string): ScientificJob {
    const job = this.records.get(jobId)
    if (!job) {
      throw new ScientificJobRepositoryError('JOB_NOT_FOUND', `Задание ${jobId} не найдено.`)
    }
    return job
  }

  private createFreshJob(input: CreateScientificJobInput, idempotencyKey: string): ScientificJob {
    const timestamp = this.timestamp()
    const jobId = this.nextJobId(idempotencyKey)
    try {
      return createScientificJob(input, jobId, timestamp)
    } catch (error) {
      if (error instanceof ScientificJobError) {
        throw new ScientificJobRepositoryError('JOB_COMMAND_REJECTED', error.message)
      }
      throw error
    }
  }

  private commandForPoll(job: ScientificJob, step: PollStep): Command | null {
    if (job.state === 'queued') return { type: 'start', stage: 'Инициализация расчёта' }
    if (job.state === 'running') {
      const total = job.progress?.total ?? 10
      if (step === 1) {
        return {
          type: 'report_progress',
          stage: 'Расчёт',
          completed: Math.round(total * 0.6),
        }
      }
      if (step === 2) {
        return {
          type: 'report_progress',
          stage: 'Расчёт',
          completed: Math.round(total * 0.6),
          diagnostics: [{
            id: 'DIAG-DEPTH-GAP',
            code: 'DEPTH_GAP',
            severity: 'warning',
            message: 'Обнаружен разрыв глубины',
            stage: 'Расчёт',
          }],
        }
      }
      if (step >= 3) {
        return { type: 'begin_post_processing', stage: 'Подготовка постобработки' }
      }
      return {
        type: 'report_progress',
        stage: 'Расчёт',
        completed: Math.round(total * 0.6),
      }
    }

    if (job.state === 'post_processing') {
      return {
        type: 'succeed',
        stage: 'Постобработка завершена',
        resultRefs: [{
          id: 'LOG-RUN-NEW',
          type: 'log_run',
          label: 'Журнал обработки',
          route: '/geology/logs/monitor',
          checksum: 'sha256:demo-log-run',
        }],
      }
    }

    return null
  }

  private applyCommand(job: ScientificJob, command: Command): ScientificJob {
    try {
      if (command.type === 'start') {
        return applyScientificJobCommand(job, { type: 'start', stage: command.stage }, this.timestamp())
      }
      if (command.type === 'report_progress') {
        return applyScientificJobCommand(
          job,
          { type: 'report_progress', stage: command.stage, completed: command.completed, diagnostics: command.diagnostics },
          this.timestamp(),
        )
      }
      if (command.type === 'begin_post_processing') {
        return applyScientificJobCommand(job, { type: 'begin_post_processing', stage: command.stage }, this.timestamp())
      }
      if (command.type === 'succeed') {
        return applyScientificJobCommand(
          job,
          { type: 'succeed', stage: command.stage, resultRefs: command.resultRefs },
          this.timestamp(),
        )
      }
      return applyScientificJobCommand(job, { type: 'cancel', reason: command.reason }, this.timestamp())
    } catch (error) {
      if (error instanceof ScientificJobError) {
        throw new ScientificJobRepositoryError('JOB_COMMAND_REJECTED', error.message)
      }
      throw error
    }
  }

  private isActive(state: ScientificJob['state']): boolean {
    return state === 'queued' || state === 'running' || state === 'post_processing'
  }

  private canRetry(job: ScientificJob): boolean {
    if (job.state !== 'failed' && job.state !== 'cancelled') return false
    return job.state === 'cancelled' || job.problem?.retriable === true
  }

  private buildRetryId(jobId: string, attempt: number): string {
    return `${jobId}-retry-${attempt}`
  }

  private nextJobId(idempotencyKey: string): string {
    this.sequence += 1
    const seed = idempotencyKey.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase()
    const normalizedSeed = seed.length > 0 ? seed : String(this.sequence)
    return `JOB-${normalizedSeed}-${String(this.sequence).padStart(4, '0')}`
  }

  private timestamp(): string {
    return new Date(initialTimestamp + this.sequence * 1000).toISOString()
  }
}

export const demoScientificJobRepository = new DemoScientificJobRepository()

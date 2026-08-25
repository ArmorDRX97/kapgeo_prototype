import {
  ScientificJobError,
  type CreateScientificJobInput,
  type JobDiagnostic,
  type ScientificJob,
  type ScientificJobCommand,
  type ScientificJobState,
} from './types'

const activeStates: ScientificJobState[] = ['queued', 'running', 'post_processing']
const clone = <T>(value: T): T => structuredClone(value)

export function createScientificJob(input: CreateScientificJobInput, id: string, createdAt: string): ScientificJob {
  if (!id.trim() || !input.label.trim() || !input.inputSnapshotId.trim() || !input.component.id.trim() || !input.component.version.trim()) {
    throw new ScientificJobError('INVALID_DEFINITION', 'Job требует id, label, input snapshot и версию вычислительного компонента.')
  }
  if (input.progressMode === 'determinate' && (!Number.isFinite(input.total) || (input.total ?? 0) <= 0 || !input.unit?.trim())) {
    throw new ScientificJobError('INVALID_DEFINITION', 'Determinate job требует положительный total и единицу прогресса.')
  }
  if (input.progressMode === 'stage_only' && (input.total !== undefined || input.unit !== undefined)) {
    throw new ScientificJobError('INVALID_DEFINITION', 'Stage-only job не должен публиковать фиктивный total.')
  }

  return {
    id,
    type: input.type,
    label: input.label.trim(),
    state: 'queued',
    stage: 'В очереди',
    progressMode: input.progressMode,
    ...(input.progressMode === 'determinate' ? { progress: { completed: 0, total: input.total!, unit: input.unit!.trim() } } : {}),
    inputSnapshotId: input.inputSnapshotId,
    component: clone(input.component),
    createdBy: clone(input.createdBy),
    createdAt,
    updatedAt: createdAt,
    attempt: 1,
    resultRefs: [],
    diagnostics: [],
    history: [{ state: 'queued', stage: 'В очереди', occurredAt: createdAt }],
  }
}

export function applyScientificJobCommand(job: ScientificJob, command: ScientificJobCommand, occurredAt: string): ScientificJob {
  if (!activeStates.includes(job.state)) {
    throw new ScientificJobError('INVALID_TRANSITION', `Job ${job.id} находится в terminal state ${job.state}.`)
  }
  const next = clone(job)
  next.updatedAt = occurredAt

  if (command.type === 'start') {
    requireState(job, ['queued'], command.type)
    next.state = 'running'
    next.stage = requiredStage(command.stage)
  } else if (command.type === 'report_progress') {
    requireState(job, ['running'], command.type)
    next.stage = requiredStage(command.stage)
    applyProgress(next, command.completed)
    appendDiagnostics(next, command.diagnostics)
  } else if (command.type === 'begin_post_processing') {
    requireState(job, ['running'], command.type)
    next.state = 'post_processing'
    next.stage = requiredStage(command.stage)
    if (next.progress) next.progress.completed = next.progress.total
    appendDiagnostics(next, command.diagnostics)
  } else if (command.type === 'succeed') {
    requireState(job, ['running', 'post_processing'], command.type)
    next.state = 'succeeded'
    next.stage = requiredStage(command.stage)
    if (next.progress) next.progress.completed = next.progress.total
    next.resultRefs = clone(command.resultRefs ?? [])
    appendDiagnostics(next, command.diagnostics)
    delete next.problem
  } else if (command.type === 'fail') {
    next.state = 'failed'
    next.stage = requiredStage(command.stage)
    next.problem = clone(command.problem)
    appendDiagnostics(next, command.diagnostics)
  } else {
    next.state = 'cancelled'
    next.stage = 'Отменено пользователем'
  }

  next.history.push({
    state: next.state,
    stage: next.stage,
    occurredAt,
    ...(command.type === 'cancel' && command.reason?.trim() ? { message: command.reason.trim() } : {}),
  })
  return next
}

export function retryScientificJob(job: ScientificJob, id: string, occurredAt: string): ScientificJob {
  if (job.state !== 'failed' && job.state !== 'cancelled') {
    throw new ScientificJobError('RETRY_NOT_ALLOWED', 'Повтор доступен только для failed или cancelled job.')
  }
  if (job.state === 'failed' && !job.problem?.retriable) {
    throw new ScientificJobError('RETRY_NOT_ALLOWED', `Ошибка ${job.problem?.code ?? 'UNKNOWN'} не допускает автоматический retry.`)
  }
  const total = job.progressMode === 'determinate' ? job.progress?.total : undefined
  const retried = createScientificJob({
    type: job.type,
    label: job.label,
    progressMode: job.progressMode,
    ...(total !== undefined ? { total, unit: job.progress!.unit } : {}),
    inputSnapshotId: job.inputSnapshotId,
    component: job.component,
    createdBy: job.createdBy,
  }, id, occurredAt)
  retried.attempt = job.attempt + 1
  retried.parentJobId = job.parentJobId ?? job.id
  retried.history[0]!.message = `Повтор job ${job.id}`
  return retried
}

export function scientificJobPercent(job: ScientificJob): number | undefined {
  if (!job.progress) return undefined
  return Math.round((job.progress.completed / job.progress.total) * 100)
}

export function isScientificJobActive(job: ScientificJob): boolean {
  return activeStates.includes(job.state)
}

export function canRetryScientificJob(job: ScientificJob): boolean {
  return job.state === 'cancelled' || (job.state === 'failed' && job.problem?.retriable === true)
}

function applyProgress(job: ScientificJob, completed: number | undefined) {
  if (job.progressMode === 'stage_only') {
    if (completed !== undefined) throw new ScientificJobError('INVALID_PROGRESS', 'Stage-only job не публикует процент выполнения.')
    return
  }
  if (!job.progress || completed === undefined || !Number.isFinite(completed) || completed < job.progress.completed || completed > job.progress.total) {
    throw new ScientificJobError('INVALID_PROGRESS', 'Progress должен быть конечным, монотонным и находиться внутри total.')
  }
  job.progress.completed = completed
}

function appendDiagnostics(job: ScientificJob, diagnostics: JobDiagnostic[] | undefined) {
  if (!diagnostics?.length) return
  const existingIds = new Set(job.diagnostics.map((item) => item.id))
  for (const diagnostic of diagnostics) {
    if (!existingIds.has(diagnostic.id)) job.diagnostics.push(clone(diagnostic))
  }
}

function requireState(job: ScientificJob, states: ScientificJobState[], command: ScientificJobCommand['type']) {
  if (!states.includes(job.state)) throw new ScientificJobError('INVALID_TRANSITION', `${command} недоступен из state ${job.state}.`)
}

function requiredStage(stage: string): string {
  const normalized = stage.trim()
  if (!normalized) throw new ScientificJobError('INVALID_DEFINITION', 'Job stage не может быть пустым.')
  return normalized
}

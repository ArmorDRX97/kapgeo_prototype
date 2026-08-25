import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelScientificJob, createScientificJob, fetchScientificJobs, pollScientificJob, retryScientificJob } from '../../repository/api'
import { emitScienceJobLifecycleEvent, type ScienceJobAuditContext, type ScienceJobEventPayload } from './auditScienceJobEvents'
import { emitJobLifecycleAudit, emitJobRetryScheduledAudit } from './applyScienceJobAudit'
import type { AuditActor } from '../../shared/audit'
import { getScienceJobAuditLog } from '../../shared/audit'
import { useSession } from '../../entities/session/model/sessionContext'
import type { CreateScientificJobInput, ScientificJob, ScientificJobState } from '../../shared/scientific/jobs'

export const scientificJobsQueryKey = ['scientific-jobs'] as const

export function useScientificJobs() {
  const queryClient = useQueryClient()
  const { persona } = useSession()
  const query = useQuery({ queryKey: scientificJobsQueryKey, queryFn: fetchScientificJobs, staleTime: 5_000 })

  const auditActor: AuditActor = useMemo(
    () =>
      persona
        ? { id: persona.id, type: 'user', name: persona.name, scope: persona.scope }
        : { id: 'system', type: 'system', name: 'system', scope: 'anonymous' },
    [persona?.id, persona?.name, persona?.scope],
  )
  const auditLog = getScienceJobAuditLog()

  const upsert = (job: ScientificJob) => queryClient.setQueryData<ScientificJob[]>(scientificJobsQueryKey, (current = []) => {
    const next = current.filter((item) => item.id !== job.id)
    return [job, ...next].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))
  })

  const createMutation = useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateScientificJobInput; idempotencyKey: string }) =>
      createScientificJob(input, idempotencyKey),
    onSuccess: (job, variables) => {
      upsert(job)
      emitJobLifecycleAudit({
        storage: auditLog,
        context: withContext(job, { actor: auditActor, idempotencyKey: variables.idempotencyKey }),
        before: undefined,
        after: job,
      })
    },
    onError: (_error, variables) => {
      emitScienceJobLifecycleEvent(
        auditLog,
        {
          actor: auditActor,
          job: {
            ...fallbackJob(variables.idempotencyKey),
            component: { id: 'unknown', version: 'unknown' },
          },
          requestId: variables.idempotencyKey,
          idempotencyKey: variables.idempotencyKey,
        },
        'failed',
        {
          errorCode: 'CREATE_FAILED',
          errorMessage: 'failed to create scientific job',
        },
      )
    },
  })

  const pollMutation = useMutation({
    mutationFn: pollScientificJob,
    onMutate: (jobId) => {
      const jobs = queryClient.getQueryData<ScientificJob[]>(scientificJobsQueryKey) ?? []
      return { before: jobs.find((item) => item.id === jobId) }
    },
    onSuccess: (job, jobId, context) => {
      upsert(job)
      const payload = extractProgressPayload(job, context?.before)
      emitJobLifecycleAudit({
        storage: auditLog,
        context: withContext(job, { actor: auditActor, requestId: jobId }),
        before: context?.before,
        after: job,
        payload,
      })
    },
    onError: (_error, jobId) => {
      const jobs = queryClient.getQueryData<ScientificJob[]>(scientificJobsQueryKey) ?? []
      const current = jobs.find((item) => item.id === jobId)
      if (!current) return
      emitJobLifecycleAudit({
        storage: auditLog,
        context: withContext(current, { actor: auditActor, requestId: jobId }),
        before: current,
        after: current,
      })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) => cancelScientificJob(jobId, reason),
    onMutate: (variables) => {
      const jobs = queryClient.getQueryData<ScientificJob[]>(scientificJobsQueryKey) ?? []
      return { before: jobs.find((item) => item.id === variables.jobId), variables }
    },
    onSuccess: (job, variables, context) => {
      upsert(job)
      emitJobLifecycleAudit({
        storage: auditLog,
        context: withContext(job, { actor: auditActor, requestId: variables.jobId }),
        before: context?.before,
        after: job,
        payload: {
          progressMessage: variables.reason,
          progressPercent:
            typeof job.progress?.completed === 'number' && typeof job.progress?.total === 'number'
              ? Math.round((job.progress.completed / job.progress.total) * 100)
              : undefined,
        },
      })
    },
  })

  const retryMutation = useMutation({
    mutationFn: retryScientificJob,
    onMutate: (jobId) => {
      const jobs = queryClient.getQueryData<ScientificJob[]>(scientificJobsQueryKey) ?? []
      return { before: jobs.find((item) => item.id === jobId) }
    },
    onSuccess: (job, jobId, context) => {
      upsert(job)
      emitJobLifecycleAudit({
        storage: auditLog,
        context: withContext(job, { actor: auditActor, requestId: `${jobId}:retry`, idempotencyKey: `retry:${jobId}` }),
        before: undefined,
        after: job,
      })

      if (context?.before) {
        emitJobRetryScheduledAudit(
          auditLog,
          withContext(context.before, { actor: auditActor, requestId: `${jobId}:retry`, idempotencyKey: `retry:${jobId}` }),
        )
      }
    },
  })

  return {
    ...query,
    jobs: query.data ?? [],
    createJob: createMutation.mutateAsync,
    pollJob: pollMutation.mutateAsync,
    cancelJob: cancelMutation.mutateAsync,
    retryJob: retryMutation.mutateAsync,
    pending: createMutation.isPending || pollMutation.isPending || cancelMutation.isPending || retryMutation.isPending,
    error: query.error ?? createMutation.error ?? pollMutation.error ?? cancelMutation.error ?? retryMutation.error,
    auditLog,
  }
}

function withContext(
  job: ScientificJob,
  extra: { actor: AuditActor; requestId?: string; idempotencyKey?: string; route?: string; traceId?: string; sessionId?: string },
): ScienceJobAuditContext {
  return {
    actor: extra.actor,
    job,
    requestId: extra.requestId,
    idempotencyKey: extra.idempotencyKey,
    route: extra.route,
    traceId: extra.traceId,
    sessionId: extra.sessionId,
  }
}

function extractProgressPayload(job: ScientificJob, previous: ScientificJob | undefined): ScienceJobEventPayload | undefined {
  if (!job.progress) return previous?.state === 'running' ? { progressMessage: job.stage } : undefined

  const percent = Math.round((job.progress.completed / job.progress.total) * 100)
  const message = [previous?.stage, job.stage].find(Boolean) ?? job.stage

  return { progressPercent: percent, progressMessage: message }
}

function fallbackJob(seed: string): ScientificJob {
  return {
    id: seed,
    type: 'file_import',
    label: 'Не удалось создать задачу',
    state: 'failed' as ScientificJobState,
    stage: 'Ошибка создания',
    progressMode: 'determinate',
    progress: { completed: 0, total: 1, unit: 'ед' },
    inputSnapshotId: 'snapshot-missing',
    component: { id: 'system', version: '0.0.0' },
    createdBy: { id: 'system', name: 'system' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempt: 1,
    parentJobId: undefined,
    resultRefs: [],
    diagnostics: [],
    history: [],
  }
}

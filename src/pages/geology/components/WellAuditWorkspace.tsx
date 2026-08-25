import { useMemo } from 'react'
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  FileText,
  History,
  Package,
  ShieldCheck,
  User,
  Workflow,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchDemoAuditEvents, fetchWellPassportHistory } from '../../../repository/api'
import type { Well } from '../../../entities/well/model/types'
import type { VersionHistory } from '../../../repository/contracts/geology'
import type { AuditEvent } from '../../../shared/audit'
import { useScientificJobs } from '../../../features/scientific-jobs'
import { Badge } from '../../../shared/ui/Badge'
import { Panel } from '../../../shared/ui/Panel'

type WellAuditSource = 'passport' | 'construction' | 'science-job'

type WellAuditEntry = {
  key: string
  source: WellAuditSource
  occurredAt: string
  actor: string
  title: string
  summary: string
  requestId?: string
  route?: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}

const versionStatusTone: Record<string, WellAuditEntry['tone']> = {
  draft: 'neutral',
  in_review: 'warning',
  approved: 'success',
  published: 'success',
  superseded: 'neutral',
  withdrawn: 'danger',
}

const scienceEventTone = {
  'science.job.created': 'info',
  'science.job.started': 'info',
  'science.job.progress': 'info',
  'science.job.retry_scheduled': 'warning',
  'science.job.cancelled': 'warning',
  'science.job.finished': 'success',
  'science.job.failed': 'danger',
} as const

const scienceEventLabel = {
  'science.job.created': 'Задача создана',
  'science.job.started': 'Задача запущена',
  'science.job.progress': 'Промежуточный прогресс',
  'science.job.retry_scheduled': 'Запланирован повтор',
  'science.job.cancelled': 'Задача отменена',
  'science.job.finished': 'Задача завершена',
  'science.job.failed': 'Ошибка задачи',
} as const

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleString('ru-RU')
}

function sourceLabel(source: WellAuditSource) {
  if (source === 'passport') return 'паспорт'
  if (source === 'construction') return 'конструкция'
  return 'science job'
}

function isScienceEntity(event: AuditEvent): event is AuditEvent & { entityType: 'science_job' } {
  return event.entityType === 'science_job'
}

export function WellAuditWorkspace({ well }: { well: Well }) {
  const { data: history, isLoading: isHistoryLoading } = useQuery<VersionHistory>({
    queryKey: ['well-passport-history', well.id],
    queryFn: () => fetchWellPassportHistory(well.id),
  })

  const { data: persistedAuditEvents = [], isLoading: isPersistentAuditLoading } = useQuery({
    queryKey: ['demo-audit-events'],
    queryFn: fetchDemoAuditEvents,
  })

  const {
    jobs,
    auditLog,
    isLoading: areJobsLoading,
  } = useScientificJobs()

  const versionRows = useMemo(() => {
    if (!history) return [] as WellAuditEntry[]

    const passportRows: WellAuditEntry[] = history.passport.map((passport) => ({
      key: `passport-${passport.id}`,
      source: 'passport',
      occurredAt: passport.createdAt,
      actor: passport.createdBy?.name || passport.createdBy.id,
      title: `Версия паспорта v${passport.version} (${passport.status})`,
      summary: passport.reason ?? 'Изменений без явной причины',
      requestId: passport.basedOnVersionId,
      tone: versionStatusTone[passport.status] ?? 'neutral',
    }))

    const constructionRows: WellAuditEntry[] = history.construction.map((construction) => ({
      key: `construction-${construction.id}`,
      source: 'construction',
      occurredAt: construction.createdAt,
      actor: construction.createdBy?.name || construction.createdBy.id,
      title: `Версия конструкции v${construction.version} (${construction.status})`,
      summary: construction.reason ?? 'Изменений без явной причины',
      tone: versionStatusTone[construction.status] ?? 'neutral',
    }))

    return [...passportRows, ...constructionRows]
  }, [history])

  const scienceRows = useMemo(() => {
    if (jobs.length === 0) return [] as WellAuditEntry[]

    const auditEvents = [...auditLog.query(), ...persistedAuditEvents]
      .filter(isScienceEntity)
      .filter((event, index, events) => events.findIndex((candidate) => candidate.id === event.id) === index)
    if (auditEvents.length === 0) return [] as WellAuditEntry[]

    const relevantByInput = new Set(
      jobs
        .filter((job) => job.inputSnapshotId.includes(well.id) || job.id.includes(well.code))
        .map((job) => job.id),
    )

    const byRequest = new Set([
      `log-import:${well.id}`,
      `log-import:${well.code}`,
      `${well.id}-`,
    ])

    return auditEvents
      .filter((event) => {
        if (relevantByInput.has(event.entityId)) return true
        if (event.requestId && [...byRequest].some((prefix) => event.requestId?.startsWith(prefix))) return true
        return false
      })
      .map<WellAuditEntry>((event) => {
        const label = scienceEventLabel[event.eventType as keyof typeof scienceEventLabel]
          ?? `Событие ${event.eventType}`

        const payload = event.payload
        const percent = payload?.progress?.percent
        const progressText =
          percent === undefined
            ? 'Прогресс не указан'
            : `${percent}% ${payload?.progress?.message ? `· ${payload.progress.message}` : ''}`

        const summaryParts = [
          payload?.environment?.route ? `Маршрут: ${payload.environment.route}` : undefined,
          payload?.resultRef?.path ? `Результат: ${payload.resultRef.path}` : undefined,
          payload?.metadata ? `Контекст: ${JSON.stringify(payload.metadata)}` : undefined,
          progressText ? progressText : undefined,
        ]

        return {
          key: `science-${event.id}`,
          source: 'science-job',
          occurredAt: event.occurredAt,
          actor: event.actor.name ?? event.actor.id,
          title: label,
          summary: summaryParts.filter(Boolean).join(' · '),
          requestId: event.requestId,
          route: payload?.environment?.route,
          tone: scienceEventTone[event.eventType as keyof typeof scienceEventTone] ?? 'neutral',
        }
      })
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.key.localeCompare(left.key))
  }, [auditLog, jobs, persistedAuditEvents, well.code, well.id])

  const allRows = useMemo(() => {
    const next = [...versionRows, ...scienceRows].sort((left, right) => {
      const byDate = right.occurredAt.localeCompare(left.occurredAt)
      if (byDate !== 0) return byDate
      return left.key.localeCompare(right.key)
    })

    return next
  }, [scienceRows, versionRows])

  if (isHistoryLoading || areJobsLoading || isPersistentAuditLoading) {
    return (
      <div className="page-loading page-loading--inline">
        <span />
        <p>Загружаем журнал аудита скважины…</p>
      </div>
    )
  }

  return (
    <div className="object-workspace audit-workspace">
      <Panel title="Журнал изменений скважины" description="Версии паспорта/конструкции и связанные scientific jobs">
        {allRows.length === 0 ? (
          <p className="audit-empty">Для этой скважины пока нет записей аудита.</p>
        ) : (
          <ol className="audit-timeline">
            {allRows.map((row) => (
              <li className="audit-timeline__row" key={row.key}>
                <span className="audit-timeline__icon" aria-hidden>
                  {row.source === 'passport' ? (
                    <FileText size={16} />
                  ) : row.source === 'construction' ? (
                    <Package size={16} />
                  ) : (
                    <Workflow size={16} />
                  )}
                </span>
                <div className="audit-timeline__body">
                  <div className="audit-timeline__header">
                    <Badge tone={row.tone}>{sourceLabel(row.source)}</Badge>
                    <strong>{row.title}</strong>
                    <time>{formatDateTime(row.occurredAt)}</time>
                  </div>
                  <span className="audit-timeline__actor"><User size={14} /> {row.actor}</span>
                  <p>{row.summary}</p>
                  {(row.requestId || row.route) && (
                    <small>
                      {row.requestId ? `Запрос ${row.requestId}` : ''}
                      {row.requestId && row.route ? ' · ' : ''}
                      {row.route ? `Роут: ${row.route}` : ''}
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="Аудит scientific jobs" description="Жизненный цикл связанных задач и промежуточные события">
        {scienceRows.length === 0 ? (
          <p className="audit-empty">События по связанным scientific jobs не найдены.</p>
        ) : (
          <div className="audit-timeline audit-timeline--compact">
            {scienceRows.map((row) => (
              <div className="audit-timeline__row" key={`${row.key}-compact`}>
                {row.tone === 'danger' ? (
                  <CircleX size={15} />
                ) : row.tone === 'warning' ? (
                  <CircleDashed size={15} />
                ) : row.tone === 'success' ? (
                  <CircleCheck size={15} />
                ) : (
                  <History size={15} />
                )}
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.summary}</span>
                  <small>
                    {formatDateTime(row.occurredAt)} · {row.actor}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Сводка"
        description={`Последняя версия: паспорта v${history?.passport.at(-1)?.version ?? well.version} · конструкции v${history?.construction.at(-1)?.version ?? well.version}`}>
        <div className="audit-summary">
          <span><ShieldCheck size={16} />Аудит содержит {allRows.length} записей</span>
          <span><Workflow size={16} />Задач: {scienceRows.length}</span>
        </div>
      </Panel>
    </div>
  )
}

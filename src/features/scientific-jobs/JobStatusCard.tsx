import { AlertTriangle, Ban, CheckCircle2, CircleX, FileClock, RefreshCw, RotateCcw } from 'lucide-react'
import { canRetryScientificJob, isScientificJobActive, scientificJobPercent, type ScientificJob } from '../../shared/scientific/jobs'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import './scientific-jobs.css'

const stateLabel: Record<ScientificJob['state'], string> = {
  queued: 'В очереди', running: 'Выполняется', post_processing: 'Постобработка', succeeded: 'Выполнено', failed: 'Ошибка', cancelled: 'Отменено',
}
const stateTone: Record<ScientificJob['state'], 'neutral' | 'info' | 'ai' | 'success' | 'danger' | 'warning'> = {
  queued: 'neutral', running: 'info', post_processing: 'ai', succeeded: 'success', failed: 'danger', cancelled: 'warning',
}

export function JobStatusCard({
  job,
  compact = false,
  pending = false,
  onPoll,
  onCancel,
  onRetry,
}: {
  job: ScientificJob
  compact?: boolean
  pending?: boolean
  onPoll?: (jobId: string) => void
  onCancel?: (jobId: string) => void
  onRetry?: (jobId: string) => void
}) {
  const percent = scientificJobPercent(job)
  const warningCount = job.diagnostics.filter((item) => item.severity === 'warning').length
  const errorCount = job.diagnostics.filter((item) => item.severity === 'error').length
  const Icon = job.state === 'succeeded' ? CheckCircle2 : job.state === 'failed' ? CircleX : job.state === 'cancelled' ? Ban : FileClock

  return <article className={`scientific-job${compact ? ' scientific-job--compact' : ''}`} aria-label={`${job.id} ${job.label}`}>
    <div className="scientific-job__header">
      <span className={`scientific-job__icon scientific-job__icon--${job.state}`}><Icon size={18} /></span>
      <span className="scientific-job__title"><strong>{job.label}</strong><small>{job.id} · попытка {job.attempt} · {job.component.id} {job.component.version}</small></span>
      <Badge tone={stateTone[job.state]}>{stateLabel[job.state]}</Badge>
    </div>
    <div className="scientific-job__stage"><strong>{job.stage}</strong>{percent !== undefined ? <span>{percent}%</span> : <span>Прогресс по этапам</span>}</div>
    {percent !== undefined
      ? <div className="scientific-job__progress" role="progressbar" aria-label={`Прогресс ${job.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>
      : <div className="scientific-job__indeterminate" aria-label="Точный процент недоступен"><span /></div>}
    {job.progress && <small className="scientific-job__measure">{job.progress.completed.toLocaleString('ru-RU')} / {job.progress.total.toLocaleString('ru-RU')} {job.progress.unit}</small>}
    {!compact && <>
      <dl className="scientific-job__meta"><div><dt>Input snapshot</dt><dd>{job.inputSnapshotId}</dd></div><div><dt>Обновлено</dt><dd>{new Date(job.updatedAt).toLocaleString('ru-RU')}</dd></div></dl>
      {job.problem && <div className="scientific-job__problem" role="alert"><CircleX size={16} /><span><strong>{job.problem.title}</strong><small>{job.problem.detail}</small><code>{job.problem.code}</code></span></div>}
      {job.diagnostics.length > 0 && <div className="scientific-job__diagnostics" aria-label={`Диагностика ${job.id}`}>
        {job.diagnostics.map((item) => <div key={item.id} className={`is-${item.severity}`}>{item.severity === 'error' ? <CircleX size={14} /> : <AlertTriangle size={14} />}<span><strong>{item.code}</strong>{item.message}</span></div>)}
      </div>}
      {job.resultRefs.length > 0 && <div className="scientific-job__results"><strong>Результаты</strong>{job.resultRefs.map((item) => <span key={item.id}>{item.label} · {item.id}</span>)}</div>}
    </>}
    {(warningCount > 0 || errorCount > 0) && <div className="scientific-job__counts">{errorCount > 0 && <span>{errorCount} error</span>}{warningCount > 0 && <span>{warningCount} warning</span>}</div>}
    {!compact && (onPoll || onCancel || onRetry) && <div className="scientific-job__actions">
      {isScientificJobActive(job) && onPoll && <Button size="sm" variant="secondary" disabled={pending} onClick={() => onPoll(job.id)}><RefreshCw size={14} /> Обновить статус</Button>}
      {isScientificJobActive(job) && onCancel && <Button size="sm" variant="quiet" disabled={pending} onClick={() => onCancel(job.id)}><Ban size={14} /> Отменить</Button>}
      {canRetryScientificJob(job) && onRetry && <Button size="sm" variant="secondary" disabled={pending} onClick={() => onRetry(job.id)}><RotateCcw size={14} /> Повторить</Button>}
    </div>}
  </article>
}

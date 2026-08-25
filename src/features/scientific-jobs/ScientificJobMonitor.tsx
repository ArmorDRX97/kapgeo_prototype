import { X } from 'lucide-react'
import { isScientificJobActive } from '../../shared/scientific/jobs'
import { JobStatusCard } from './JobStatusCard'
import { useScientificJobs } from './useScientificJobs'

export function ScientificJobMonitor({ onClose }: { onClose: () => void }) {
  const { jobs, isLoading, pending, pollJob, cancelJob, retryJob } = useScientificJobs()
  const activeCount = jobs.filter(isScientificJobActive).length
  const failedCount = jobs.filter((job) => job.state === 'failed').length

  return <section className="job-monitor" id="scientific-job-monitor" aria-label="Фоновые задачи">
    <header><span><strong>Фоновые задачи</strong><small>{activeCount} активных · {failedCount} с ошибкой</small></span><button type="button" onClick={onClose} aria-label="Закрыть фоновые задачи"><X size={17} /></button></header>
    <div className="job-monitor__body">
      {isLoading && <p>Загружаем состояния jobs…</p>}
      {!isLoading && jobs.length === 0 && <p>Фоновых операций пока нет.</p>}
      {jobs.map((job) => <JobStatusCard
        key={job.id}
        job={job}
        pending={pending}
        onPoll={(jobId) => void pollJob(jobId)}
        onCancel={(jobId) => void cancelJob({ jobId, reason: 'Отменено пользователем из общего монитора' })}
        onRetry={(jobId) => void retryJob(jobId)}
      />)}
    </div>
  </section>
}

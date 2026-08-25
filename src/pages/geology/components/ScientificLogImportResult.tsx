import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileCheck2 } from 'lucide-react'
import type { Well } from '../../../entities/well/model/types'
import { JobStatusCard, useScientificJobs } from '../../../features/scientific-jobs'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

export function ScientificLogImportResult({ well, onClose }: { well: Well; onClose: () => void }) {
  const started = useRef(false)
  const [jobId, setJobId] = useState<string>()
  const { jobs, createJob, pollJob, cancelJob, retryJob, pending, error } = useScientificJobs()
  const job = jobs.find((item) => item.id === jobId)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void createJob({
      idempotencyKey: `log-import:${well.id}:las-demo-20260821`,
      input: {
        type: 'file_import',
        label: `Импорт LAS · ${well.code}`,
        progressMode: 'determinate',
        total: 1_248,
        unit: 'строк',
        inputSnapshotId: `FILE-SHA256-LAS-${well.id}-20260821`,
        component: { id: 'las-parser', version: '2.4.1' },
        createdBy: { id: 'PERSON-R1-GEOLOGIST', name: 'Ирина Иванова · synthetic' },
      },
    }).then((created) => setJobId(created.id))
  }, [createJob, well.code, well.id])

  const retry = async (id: string) => {
    const retried = await retryJob(id)
    setJobId(retried.id)
  }

  return <div className="page-stack">
    <div className="page-heading">
      <div>
        <span className="eyebrow">ГИС · {well.code}</span>
        <h1>Импорт передан в обработку</h1>
        <p>Файл зафиксирован как входной snapshot. Набор кривых появится только после успешного завершения задачи.</p>
      </div>
      <Button variant="quiet" onClick={onClose}><ArrowLeft size={16} /> Вернуться к ГИС</Button>
    </div>

    <Panel title="Научная задача" description="Операция выполняется в фоне и доступна в общем мониторе задач.">
      {!job && !error && <div className="scientific-job__loading"><FileCheck2 size={20} /> Постановка импорта в очередь…</div>}
      {error && <div className="alert alert--danger" role="alert">Не удалось создать или обновить задачу: {error.message}</div>}
      {job && <JobStatusCard
        job={job}
        pending={pending}
        onPoll={(id) => void pollJob(id)}
        onCancel={(id) => void cancelJob({ jobId: id, reason: 'Отменено пользователем в мастере импорта' })}
        onRetry={(id) => void retry(id)}
      />}
    </Panel>
  </div>
}

import { BookOpenCheck, BrainCircuit, RefreshCw, Settings2, Unplug } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AdminOperationsPage() {
  const [retried, setRetried] = useState(false)
  const [published, setPublished] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="Администрирование · ADM-07–19" title="Справочники, интеграции и AI" description="Версионные нормативы, безопасная диагностика очереди и жизненный цикл AI-модели." meta={<Badge tone="ai" dot>2 интеграции · AI anomaly-ranking v0.8</Badge>} />
    <div className="admin-operations"><Panel title="Нормативы и справочники" description="Версионные значения с impact preview"><div className="admin-operation-row"><BookOpenCheck size={20} /><span><strong>Норма небаланса раствора · v4</strong><small>Порог 3,0% · затронет 12 расчётов и 3 отчёта</small></span><button type="button" className="button button--secondary button--sm" onClick={() => setPublished(true)}>{published ? 'Опубликовано' : 'Опубликовать v4'}</button></div></Panel><Panel title="Интеграции и очередь" description="Диагностика без раскрытия секретов"><div className="admin-operation-row"><Unplug size={20} /><span><strong>LIMS import</strong><small>{retried ? 'Повтор запущен · JOB-442 в очереди' : 'JOB-441: 2 записи требуют повторного сопоставления'}</small></span><button type="button" className="button button--secondary button--sm" onClick={() => setRetried(true)}><RefreshCw size={15} />Retry</button></div><div className="admin-operation-row"><Settings2 size={20} /><span><strong>Telemetry gateway</strong><small>Состояние: подключено · последний пакет 10:20</small></span><Badge tone="success">OK</Badge></div></Panel><Panel title="AI-модель" description="Публикация требует review"><div className="admin-operation-row"><BrainCircuit size={20} /><span><strong>anomaly-ranking v0.8</strong><small>Precision 0,82 · dataset 2026-Q3 · ограничения отображаются в рекомендациях</small></span><Badge tone="success">Published</Badge></div></Panel></div>
  </div>
}

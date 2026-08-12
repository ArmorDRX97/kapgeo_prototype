import { CheckCircle2, FileUp, RotateCcw, ShieldAlert, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function WorkflowCenterPage() {
  const [review, setReview] = useState<'pending' | 'approved' | 'changes'>('pending')
  const [retry, setRetry] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="Общая платформа · E08" title="Workflow, качество и фоновые задачи" description="Единый контур согласования, импорта и экспорта, качества данных и аудита изменений." meta={<Badge tone="warning" dot>1 approval · 1 quality issue · 1 job</Badge>} />
    <div className="workflow-grid"><Panel title="Review / approval" description="GEO-PR07 v12 → модель RESULT-07"><div className="workflow-card"><span><strong>Публикация RESULT-07</strong><small>Входы: GEO v12 · TECH rev.2 · автор: А. Садыков</small></span><Badge tone={review === 'approved' ? 'success' : review === 'changes' ? 'warning' : 'ai'}>{review === 'approved' ? 'Approved' : review === 'changes' ? 'Changes requested' : 'Review'}</Badge></div><div className="workflow-actions"><button type="button" className="button button--primary button--md" disabled={review !== 'pending'} onClick={() => setReview('approved')}><CheckCircle2 size={16} />Одобрить</button><button type="button" className="button button--secondary button--md" disabled={review !== 'pending'} onClick={() => setReview('changes')}><XCircle size={16} />Вернуть на доработку</button></div></Panel><Panel title="Data quality issue" description="DQ-084 · WELL-1042"><div className="workflow-card"><ShieldAlert size={20} /><span><strong>Приемистость ниже ожидаемого диапазона</strong><small>Evidence: S-2026-08-10-02 · требуется повторный замер</small></span><Badge tone="warning">Открыт</Badge></div><button type="button" className="button button--secondary button--md">Создать задачу</button></Panel><Panel title="Импорт / фоновые задачи" description="JOB-441 · LIMS import"><div className="workflow-card"><FileUp size={20} /><span><strong>{retry ? 'Повторный импорт в очереди' : '12 строк требуют mapping'}</strong><small>Файл → mapping → validation → result · лог доступен</small></span><Badge tone={retry ? 'ai' : 'warning'}>{retry ? 'Queued' : 'Issues'}</Badge></div><button type="button" className="button button--secondary button--md" onClick={() => setRetry(true)}><RotateCcw size={16} />Retry после mapping</button></Panel></div>
  </div>
}

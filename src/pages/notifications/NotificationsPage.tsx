import { Bot, CheckCircle2, Database, ShieldAlert } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function NotificationsPage() {
  return <div className="page-stack">
    <PageHeader eyebrow="Общая платформа · GLB-03" title="Уведомления" description="События, требующие внимания, и завершение фоновых операций." meta={<Badge tone="info">3 новых</Badge>} />
    <Panel><div className="notification-list">
      <article className="is-new"><span><Bot size={18} /></span><div><strong>AI-интерпретация завершена</strong><p>Найдено одно существенное расхождение по WELL-1042.</p><small>Сегодня, 09:42 · Геология</small></div><Link to="/geology/interpretations/$interpretationId/compare" params={{ interpretationId: 'INT-WELL-1042-07' }} className="button button--secondary button--sm">Открыть</Link></article>
      <article className="is-new"><span><Database size={18} /></span><div><strong>Импорт завершён с предупреждениями</strong><p>Обработано 1 248 строк, 12 предупреждений требуют просмотра.</p><small>Сегодня, 09:18 · JOB-39</small></div><Link to="/objects/wells/$wellId" params={{ wellId: 'WELL-1042' }} search={{ tab: 'logs' }} className="button button--secondary button--sm">Протокол</Link></article>
      <article className="is-new"><span><ShieldAlert size={18} /></span><div><strong>Область доступа истекает</strong><p>Доступ к участку Северный завершится через 7 дней.</p><small>Вчера, 17:20 · Безопасность</small></div><Link to="/profile" className="button button--secondary button--sm">Продлить</Link></article>
      <article><span><CheckCircle2 size={18} /></span><div><strong>Версия интерпретации утверждена</strong><p>INT-WELL-1038-04 опубликована для связанных модулей.</p><small>8 августа, 16:44 · Геология</small></div></article>
    </div></Panel>
  </div>
}

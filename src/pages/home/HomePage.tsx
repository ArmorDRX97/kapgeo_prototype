import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock3, Database, MapPinned } from 'lucide-react'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchHomeSummary } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { MetricCard } from '../../shared/ui/MetricCard'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function HomePage() {
  const { persona } = useSession()
  const summary = useQuery({ queryKey: ['home-summary', persona?.id], queryFn: fetchHomeSummary })

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Рабочий стол · HOME-01"
        title={`Добрый день, ${persona?.name.split(' ')[0] ?? 'коллега'}`}
        description={`${persona?.position ?? ''} · ${persona?.scope ?? ''} · состояние на 10 августа 2026`}
        meta={<Badge tone="success" dot>Данные актуальны</Badge>}
      />

      <div className="metrics-grid">
        <MetricCard icon={Clock3} label="Мои задачи" value="7" detail="2 требуют решения сегодня" tone="teal" />
        <MetricCard icon={AlertTriangle} label="Качество данных" value="12" detail="3 блокирующие проблемы" tone="amber" />
        <MetricCard icon={Bot} label="AI-проверка" value="4" detail="1 существенное расхождение" tone="violet" />
        <MetricCard icon={Database} label="Фоновые задачи" value="2" detail="Один импорт с предупреждениями" tone="blue" />
      </div>

      <div className="dashboard-grid">
        <Panel title="Приоритетные задачи" description="Сформировано по вашей роли и области доступа" action={<Link to="/work" className="text-link">Все задачи <ArrowRight size={15} /></Link>}>
          <div className="task-list" aria-busy={summary.isLoading}>
            {summary.isLoading && <div className="skeleton skeleton--list" />}
            {summary.data?.tasks.map((task) => (
              <Link key={task.id} to={task.object === 'WELL-1042' ? '/objects/wells/$wellId' : '/work'} params={task.object === 'WELL-1042' ? { wellId: task.object } : {}} className="task-row">
                <span className={`task-row__status task-row__status--${task.tone}`} />
                <span className="task-row__main"><strong>{task.title}</strong><small>{task.object} · {task.id}</small></span>
                <span className="task-row__due">{task.due}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Состояние участка" description="Сарытау · Северный" action={<Link to="/geology" className="text-link">Открыть карту <ArrowRight size={15} /></Link>}>
          <div className="mini-site-map" aria-label="Схематичная карта состояния участка">
            <div className="mini-site-map__grid" />
            <span className="site-shape site-shape--one" />
            <span className="site-shape site-shape--two" />
            {[
              ['42%', '35%', 'warning'], ['54%', '47%', 'success'], ['68%', '31%', 'info'], ['31%', '61%', 'success'], ['76%', '67%', 'danger'],
            ].map(([left, top, tone], index) => <span key={index} className={`map-dot map-dot--${tone}`} style={{ left, top }} />)}
            <div className="mini-site-map__legend"><span><i className="legend-dot legend-dot--warning" /> Требует внимания</span><span><i className="legend-dot legend-dot--success" /> В норме</span></div>
          </div>
        </Panel>

        <Panel title="Фоновые операции" className="dashboard-grid__wide">
          <div className="job-grid">
            {summary.data?.jobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-card__icon">{job.progress === 100 ? <CheckCircle2 size={19} /> : <Bot size={19} />}</div>
                <div className="job-card__main"><strong>{job.title}</strong><span>{job.id} · {job.status}</span><div className="progress"><span style={{ width: `${job.progress}%` }} /></div></div>
                <strong className="job-card__progress">{job.progress}%</strong>
              </article>
            ))}
            <Link to="/geology/wells" className="quick-action"><MapPinned size={20} /><span><strong>Продолжить с геологией</strong><small>Реестр и карта скважин</small></span><ArrowRight size={17} /></Link>
          </div>
        </Panel>
      </div>
    </div>
  )
}

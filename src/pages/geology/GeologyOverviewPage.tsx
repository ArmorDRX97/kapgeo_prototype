import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Columns3, FileCheck2, Map, Mountain, RadioTower } from 'lucide-react'
import { fetchWells } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { MetricCard } from '../../shared/ui/MetricCard'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { WellMap } from './components/WellMap'

export function GeologyOverviewPage() {
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Геологический модуль · GEO-01"
        title="Геология месторождения"
        description="Скважины, первичные материалы, ГИС, интерпретации, карты, разрезы и запасы."
        meta={<Badge tone="success" dot>Сарытау · Северный</Badge>}
        actions={<Link to="/geology/wells" className="button button--primary button--md">Открыть реестр <ArrowRight size={17} /></Link>}
      />

      <div className="metrics-grid">
        <MetricCard icon={Mountain} label="Скважины" value="1 200" detail="1 146 опубликованы" />
        <MetricCard icon={RadioTower} label="Наборы ГИС" value="2 400" detail="18 ожидают проверки" tone="blue" />
        <MetricCard icon={AlertTriangle} label="AI-расхождения" value="4" detail="1 существенное сегодня" tone="violet" />
        <MetricCard icon={FileCheck2} label="Проекты запасов" value="6" detail="2 на согласовании" tone="amber" />
      </div>

      <div className="geology-overview-grid">
        <Panel className="geology-overview-grid__map" title="Скважины и качество данных" description="Интерактивный слой · на 10 августа 2026" action={<Link to="/geology/map" className="text-link">Полный экран <ArrowRight size={15} /></Link>}>
          <WellMap wells={wellsQuery.data ?? []} compact />
        </Panel>

        <Panel title="Требует внимания" description="Объекты в вашей области">
          <div className="attention-list">
            {(wellsQuery.data ?? []).filter((well) => well.activeTask).slice(0, 4).map((well) => (
              <Link key={well.id} to="/objects/wells/$wellId" params={{ wellId: well.id }} className="attention-item">
                <span className={`well-type well-type--${well.type.toLowerCase()}`}><RadioTower size={16} /></span>
                <span><strong>{well.code}</strong><small>{well.activeTask}</small></span>
                <Badge tone={well.aiConflicts ? 'ai' : 'warning'}>{well.aiConflicts ? `${well.aiConflicts} AI` : well.completeness + '%'}</Badge>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="module-shortcuts">
        <Link to="/geology/map" className="module-shortcut-link"><Map size={20} /><div><strong>Карта скважин</strong><span>Слои, фильтры и cross-selection объектов</span></div><Badge>GEO-03</Badge></Link>
        <Link to="/geology/correlation" className="module-shortcut-link"><Columns3 size={20} /><div><strong>Колонки и разрезы</strong><span>Синхронные глубинные представления и корреляция профиля</span></div><Badge>GEO-19–20</Badge></Link>
        <Link to="/geology/reserves" className="module-shortcut-link"><FileCheck2 size={20} /><div><strong>Подсчёт запасов</strong><span>Проект, прозрачный расчёт и передача на согласование</span></div><Badge>GEO-21</Badge></Link>
      </div>
    </div>
  )
}

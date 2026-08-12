import { Link, useParams } from '@tanstack/react-router'
import { FileOutput, GitCompareArrows, Map } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function ModelResultsPage() {
  const { projectId } = useParams({ from: '/modeling/results/$projectId' })
  const [published, setPublished] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="Модуль моделирования · MOD-16–21" title="RESULT-07" description="Карта и показатели по успешному запуску BASE-01." meta={<Badge tone={published ? 'success' : 'warning'} dot>{published ? 'Опубликовано' : 'Готово к публикации'}</Badge>} />
    <div className="results-layout"><Panel title="Карта результата" description="Прогноз приемистости через 30 суток"><div className="result-map">{Array.from({ length: 64 }, (_, index) => <i key={index} style={{ opacity: .25 + (index % 8) / 10 }} />)}</div><div className="result-legend"><Map size={16} />Низкая <span /> Высокая</div></Panel><aside className="results-aside"><Panel title="KPI"><div className="result-kpis"><div><span>Приемистость</span><strong>81 м³/ч</strong></div><div><span>Fit</span><strong>0,91</strong></div></div></Panel><Panel title="Действия"><div className="result-actions"><Link to="/modeling/compare" className="button button--secondary button--md"><GitCompareArrows size={16} />Сравнить</Link><button type="button" className="button button--primary button--md" disabled={published} onClick={() => setPublished(true)}><FileOutput size={16} />{published ? 'Опубликовано' : 'Опубликовать'}</button><Link to="/modeling/run/$projectId" params={{ projectId }} className="text-link">К запуску</Link></div></Panel></aside></div>
  </div>
}

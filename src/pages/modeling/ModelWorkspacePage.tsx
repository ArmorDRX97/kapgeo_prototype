import { Link, useParams } from '@tanstack/react-router'
import { CheckCircle2, Grid3X3, Play } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function ModelWorkspacePage() {
  const { projectId } = useParams({ from: '/modeling/workspace/$projectId' })
  const [preflight, setPreflight] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="Модуль моделирования · MOD-02–12" title={`${projectId} · workspace`} description="Сетка, домены, поля и условия в зафиксированном snapshot." meta={<Badge tone={preflight ? 'success' : 'warning'} dot>{preflight ? 'Preflight пройден' : 'Требуется preflight'}</Badge>} />
    <div className="model-workspace"><Panel className="model-tree" title="Состав модели"><div>{['Домены', 'Сетка', 'Поля', 'Скважины', 'Условия'].map((item) => <button type="button" key={item}>{item}{item === 'Сетка' && <Badge tone="success">1,2M</Badge>}</button>)}</div></Panel><Panel className="model-canvas" title="Сетка"><div className="model-grid-preview">{Array.from({ length: 72 }, (_, index) => <i key={index} className={index % 11 === 0 ? 'is-active' : ''} />)}</div><div className="model-inspector"><Grid3X3 size={19} /><span><strong>120 × 100 × 100</strong><small>25 × 25 × 5 м</small></span></div></Panel><aside className="model-aside"><Panel title="Preflight"><div className="correlation-checks"><div><Badge tone="success">Готово</Badge><span>Snapshot-версии доступны.</span></div><div><Badge tone="success">Готово</Badge><span>Условия заполнены.</span></div></div><button type="button" className="button button--primary button--md" onClick={() => setPreflight(true)}><CheckCircle2 size={16} />Проверить</button></Panel><Link to="/modeling/run/$projectId" params={{ projectId }} className="button button--secondary button--md"><Play size={16} />К запуску</Link></aside></div>
  </div>
}

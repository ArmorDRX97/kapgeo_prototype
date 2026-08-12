import { Link } from '@tanstack/react-router'
import { Boxes, GitBranchPlus, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function ModelingPage() {
  const [created, setCreated] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="Модуль моделирования · MOD-01" title="Расчётные проекты" description="Проекты создаются из неизменяемых опубликованных snapshot GEO и TECH." actions={<button type="button" className="button button--primary button--md" onClick={() => setCreated(true)}><GitBranchPlus size={16} />Создать snapshot</button>} />
    <div className="model-project-grid"><Panel title="Проекты" description="GEO v12 · TECH rev.2"><div className="model-project-list"><Link to="/modeling/workspace/$projectId" params={{ projectId: 'MOD-PR-07' }} className="is-selected"><Boxes size={20} /><span><strong>MOD-PR-07 · Северный контур</strong><small>BASE-01 · готов к запуску</small></span><Badge tone="success">Готов</Badge></Link>{created && <Link to="/modeling/workspace/$projectId" params={{ projectId: 'MOD-PR-08' }} className="is-new"><Boxes size={20} /><span><strong>MOD-PR-08 · новый snapshot</strong><small>GEO v12 · TECH rev.2</small></span><Badge tone="warning">Draft</Badge></Link>}</div></Panel><Panel title="Входы snapshot" description="Не подменяются в существующем проекте"><div className="snapshot-card"><div><span>Геология</span><strong>GEO-PR07-2026-08 · v12</strong></div><div><span>Технология</span><strong>OP-DAY-03 · rev.2</strong></div><div><span>Запуск</span><strong>BASE-01 · Medium profile</strong></div><Link to="/modeling/workspace/$projectId" params={{ projectId: 'MOD-PR-07' }} className="button button--secondary button--md"><PlayCircle size={16} />Открыть workspace</Link></div></Panel></div>
  </div>
}

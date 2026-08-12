import { AlertTriangle, ArrowRight, Bot, CalendarClock, CheckCircle2, Filter, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const tasks = [
  { id: 'TASK-118', title: 'Разрешить расхождение AI', object: 'WELL-1042', module: 'Геология', due: 'Сегодня, 14:00', tone: 'ai' as const, icon: Bot },
  { id: 'TASK-121', title: 'Проверить новый набор ГИС', object: 'WELL-1046', module: 'Геология', due: 'Сегодня, 17:30', tone: 'info' as const, icon: CheckCircle2 },
  { id: 'TASK-109', title: 'Дополнить литологический интервал', object: 'WELL-1019', module: 'Геология', due: 'Просрочено', tone: 'danger' as const, icon: AlertTriangle },
]

export function WorkPage() {
  return <div className="page-stack">
    <PageHeader eyebrow="Общая платформа · WORK-01" title="Мои задачи" description="Личная очередь проверки, согласования и предметных действий." meta={<Badge tone="warning">7 открытых</Badge>} />
    <div className="filter-bar"><label className="search-field"><Search size={17} /><input placeholder="Задача, объект или ID…" /></label><Button variant="secondary"><Filter size={16} /> Все статусы</Button><Button variant="secondary"><CalendarClock size={16} /> По сроку</Button></div>
    <Panel>
      <div className="work-table">
        <div className="work-table__head"><span>Задача</span><span>Модуль</span><span>Срок</span><span>Статус</span><span /></div>
        {tasks.map(({ icon: Icon, ...task }) => (
          <Link key={task.id} to={task.object === 'WELL-1042' ? '/objects/wells/$wellId' : '/geology/wells'} params={task.object === 'WELL-1042' ? { wellId: task.object } : {}} className="work-table__row">
            <span className="work-table__title"><i><Icon size={17} /></i><span><strong>{task.title}</strong><small>{task.object} · {task.id}</small></span></span><span>{task.module}</span><span>{task.due}</span><Badge tone={task.tone}>Назначено</Badge><ArrowRight size={16} />
          </Link>
        ))}
      </div>
    </Panel>
  </div>
}

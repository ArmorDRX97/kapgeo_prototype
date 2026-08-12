import { Link, useParams } from '@tanstack/react-router'
import { CheckCircle2, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function ModelRunPage() {
  const { projectId } = useParams({ from: '/modeling/run/$projectId' })
  const [state, setState] = useState<'ready' | 'running' | 'success'>('ready')
  return <div className="page-stack"><PageHeader eyebrow="Модуль моделирования · MOD-13–15" title={`Запуск ${projectId}`} description="Очередь, этапы и журнал фиксируют входы в момент запуска." meta={<Badge tone={state === 'success' ? 'success' : 'warning'} dot>{state === 'success' ? 'Успешно' : 'Готов к запуску'}</Badge>} />
    <div className="run-layout"><Panel title="Монитор запуска" description="RUN-2026-0811-07"><div className="run-stages">{['Очередь', 'Сетка', 'Решатель', 'Постобработка', 'Результат'].map((item, index) => <div key={item} className={state === 'success' || (state === 'running' && index < 3) ? 'is-done' : ''}><i />{item}</div>)}</div><div className="run-log"><span>snapshot GEO v12 закреплён</span><span>TECH rev.2 закреплён</span>{state !== 'ready' && <span>решатель начал 1,2 млн ячеек</span>}</div><div className="run-actions">{state === 'ready' && <button type="button" className="button button--primary button--md" onClick={() => setState('running')}><PlayCircle size={16} />Запустить</button>}{state === 'running' && <button type="button" className="button button--primary button--md" onClick={() => setState('success')}><CheckCircle2 size={16} />Завершить расчёт</button>}{state === 'success' && <Link to="/modeling/results/$projectId" params={{ projectId }} className="button button--primary button--md">Открыть результат</Link>}</div></Panel><aside className="run-aside"><Panel title="Профиль"><dl className="run-facts"><div><dt>Время</dt><dd>~3 мин</dd></div><div><dt>Память</dt><dd>4,8 GB</dd></div></dl></Panel><Link to="/modeling/workspace/$projectId" params={{ projectId }} className="button button--secondary button--md">К модели</Link></aside></div>
  </div>
}

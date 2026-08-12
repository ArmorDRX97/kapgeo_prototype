import { Link } from '@tanstack/react-router'
import { Camera, CheckCircle2, ClipboardList, PauseCircle, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const stages = ['Черновик', 'Review', 'Назначен', 'В работе', 'Оценка', 'Закрыт']
export function RvrPage() {
  const [stage, setStage] = useState(2)
  const [paused, setPaused] = useState(false)
  const [completed, setCompleted] = useState(false)
  const current = completed ? 5 : stage
  return <div className="page-stack"><PageHeader eyebrow="Технологический модуль · TECH-16–19" title="РВР-042: восстановление приемистости" description="Кандидат создан из DEV-042. План и фактическое исполнение сохраняют связь с причиной, оборудованием и критериями эффекта." meta={<Badge tone={completed ? 'success' : 'warning'} dot>{completed ? 'Завершён · partial' : paused ? 'Пауза' : 'Назначен на смену'}</Badge>} actions={<Link to="/technology/balance" className="button button--secondary button--md">К отклонению</Link>} />
    <div className="rvr-layout"><Panel title="Статус наряда" description="Исполнитель: мастер РВР · окно 12:00–16:00"><div className="rvr-steps">{stages.map((item, index) => <span key={item} className={index < current ? 'is-done' : index === current ? 'is-active' : ''}>{index < current ? <CheckCircle2 size={15} /> : <i />}{item}</span>)}</div><div className="rvr-plan"><div><span>Цель</span><strong>Восстановить приемистость WELL-1042 до ≥ 82 м³/ч</strong></div><div><span>Материалы</span><strong>Кислота 12 т · ингибитор 0,4 т</strong></div><div><span>Оборудование</span><strong>НС-04 · ресурс 78% · риск средний</strong></div><div><span>Evidence</span><strong>DEV-042, замер S-02, SOL-0822</strong></div></div></Panel><aside className="rvr-aside"><Panel title="Полевое исполнение" description="Рабочее место для планшета"><div className="rvr-execution"><div><ClipboardList size={19} /><span><strong>Шаг 1. Подготовка</strong><small>Допуск и материалы подтверждены</small></span><Badge tone="success">Готово</Badge></div><div><PlayCircle size={19} /><span><strong>Шаг 2. Закачка</strong><small>{paused ? 'Остановлено оператором' : completed ? 'Факт: 11,6 т кислоты' : 'Ожидает запуска'}</small></span><Badge tone={paused ? 'warning' : completed ? 'success' : 'ai'}>{paused ? 'Пауза' : completed ? 'Готово' : 'Назначен'}</Badge></div><div><Camera size={19} /><span><strong>Фото/факт</strong><small>Фотоматериалы и данные доступны в отчёте</small></span></div>{!completed && <div className="rvr-actions"><button type="button" className="button button--secondary button--md" onClick={() => { setPaused(!paused); setStage(3) }}><PauseCircle size={16} />{paused ? 'Возобновить' : 'Пауза'}</button><button type="button" className="button button--primary button--md" disabled={paused} onClick={() => { setStage(4); setCompleted(true) }}><CheckCircle2 size={16} />Завершить и оценить</button></div>}{completed && <div className="rvr-result"><CheckCircle2 size={18} /><span><strong>Частичный эффект</strong> · приемистость 79 м³/ч, создана задача технологу на мониторинг.</span></div>}</div></Panel></aside></div>
  </div>
}

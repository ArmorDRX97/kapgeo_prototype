import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileText, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AnalyticsDecisionPage() {
  const [decision, setDecision] = useState<'none' | 'accepted' | 'rejected'>('none')
  return <div className="page-stack"><PageHeader eyebrow="Экспертно-аналитический модуль · AN-11–13" title="Отклонение и управленческое решение" description="AN-DEV-018: факт приемистости WELL-1042 ниже плана. Evidence отделено от гипотезы, а рекомендация требует решения руководителя." meta={<Badge tone="warning" dot>Требует решения</Badge>} actions={<Link to="/analytics" className="button button--secondary button--md">К обзору</Link>} />
    <div className="analytics-decision-layout"><Panel title="Evidence" description="Воспроизводимый контекст на 10 августа, 20:00"><div className="decision-evidence"><div><span>Факт</span><strong>79 м³/ч · TECH OP-DAY-03 rev.2</strong></div><div><span>План</span><strong>82 м³/ч · PLAN v3.1</strong></div><div><span>Модель</span><strong>81 м³/ч · RESULT-07 / BASE-01</strong></div><div><span>Связанное событие</span><strong>DEV-042, РВР-042: partial effect</strong></div></div><div className="decision-hypothesis"><FileText size={19} /><span><strong>Гипотеза</strong> Неполное восстановление приемистости после РВР; требуется повторный замер в следующую смену.</span></div></Panel><aside className="analytics-decision-aside"><Panel title="Рекомендация" description="Не исполняется автоматически"><p className="decision-recommendation">Создать задачу диспетчеру на повторный замер WELL-1042 до 10:00 следующей смены.</p><div className="recommendation-actions"><button type="button" className={decision === 'accepted' ? 'is-selected' : ''} onClick={() => setDecision('accepted')}><ThumbsUp size={18} />Принять решение</button><button type="button" className={decision === 'rejected' ? 'is-selected' : ''} onClick={() => setDecision('rejected')}><ThumbsDown size={18} />Отклонить</button>{decision === 'accepted' && <div className="recommendation-result"><CheckCircle2 size={17} /><span>TECH-TASK-134 создана и назначена диспетчеру.</span></div>}</div></Panel><Panel title="Паспорт аналитики" description="Сохранённый вид ANALYTICS-07"><button type="button" className="button button--secondary button--md"><Send size={16} />Сохранить вид и отчёт</button></Panel></aside></div>
  </div>
}

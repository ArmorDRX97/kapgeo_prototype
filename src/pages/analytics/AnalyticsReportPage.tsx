import { FileDown, Save, Send } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AnalyticsReportPage() {
  const [saved, setSaved] = useState(false)
  const [published, setPublished] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="Экспертно-аналитический модуль · AN-14" title="Паспорт аналитики и отчёт" description="Сохранённое представление ANALYTICS-07 фиксирует scope, срез, фильтры и источники. Отчёт воспроизводится из snapshot, а не из текущего экрана." meta={<Badge tone={published ? 'success' : 'warning'} dot>{published ? 'Отчёт опубликован' : 'Черновик view'}</Badge>} /><div className="analytics-report-layout"><Panel title="Паспорт сохранённого view" description="ANALYTICS-07 · Отклонения приемистости"><div className="report-passport"><div><span>Scope</span><strong>BLK-07-12 · 5 скважин</strong></div><div><span>As-of</span><strong>10.08.2026 20:00</strong></div><div><span>Фильтр</span><strong>Факт ниже плана &gt; 2 м³/ч</strong></div><div><span>Источники</span><strong>TECH rev.2 · RESULT-07 · PLAN v3.1</strong></div></div><button type="button" className="button button--secondary button--md" onClick={() => setSaved(true)}><Save size={16} />{saved ? 'View сохранён' : 'Сохранить view'}</button></Panel><aside className="analytics-report-aside"><Panel title="Предпросмотр отчёта" description="Форма AN-REP-02 · snapshot"><div className="report-summary"><div><Badge tone="warning">3 объекта</Badge><span>В выборке по отклонению приемистости.</span></div><div><Badge tone="success">1 решение</Badge><span>TECH-TASK-134 создана для WELL-1042.</span></div></div><div className="report-actions"><button type="button" className="button button--secondary button--md"><FileDown size={16} />PDF preview</button><button type="button" className="button button--primary button--md" disabled={published} onClick={() => setPublished(true)}><Send size={16} />{published ? 'Опубликовано' : 'Опубликовать'}</button></div></Panel></aside></div></div>
}

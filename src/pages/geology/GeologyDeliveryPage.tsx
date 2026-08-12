import { Link } from '@tanstack/react-router'
import { BarChart3, FileDown, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const targets = [{ id: 'model', title: 'Моделирование', text: 'Блок-модель, горизонты и версии интерпретации' }, { id: 'tech', title: 'Технология', text: 'Параметры руды и утверждённые запасы' }, { id: 'analytics', title: 'Аналитика', text: 'KPI запасов и качество исходных данных' }]

export function GeologyDeliveryPage() {
  const [selected, setSelected] = useState<string[]>(['model', 'tech', 'analytics'])
  const [published, setPublished] = useState(false)
  const toggle = (id: string) => { setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]); setPublished(false) }
  return <div className="page-stack"><PageHeader eyebrow="Геологический модуль · GEO-22" title="Отчёт и публикация версии" description="Соберите контролируемую выдачу по утверждённому профилю и проекту запасов. Получатели и состав данных фиксируются в audit trail." meta={<Badge tone={published ? 'success' : 'warning'} dot>{published ? 'Версия опубликована' : 'Готово к публикации'}</Badge>} actions={<Link to="/geology/reserves" className="button button--secondary button--md">К запасам</Link>} />
    <div className="delivery-layout"><Panel title="Паспорт выдачи" description="GEO-PR07-2026-08 · версия 12"><div className="delivery-facts"><div><span>Состав</span><strong>3 скважины · разрез A–A′ · C1</strong></div><div><span>Расчёт</span><strong>42 874 т руды · 609 т металла</strong></div><div><span>Ответственный</span><strong>А. Садыков, главный геолог</strong></div></div><div className="delivery-actions"><button type="button" className="button button--secondary button--md"><FileDown size={16} />Скачать PDF</button><button type="button" className="button button--primary button--md" disabled={!selected.length || published} onClick={() => setPublished(true)}><Send size={16} />{published ? 'Опубликовано' : `Опубликовать (${selected.length})`}</button></div></Panel>
      <Panel title="Получатели" description="Выберите потребителей утверждённой версии"><div className="delivery-targets">{targets.map((target) => <label key={target.id} className={selected.includes(target.id) ? 'is-selected' : ''}><input type="checkbox" checked={selected.includes(target.id)} onChange={() => toggle(target.id)} /><BarChart3 size={19} /><span><strong>{target.title}</strong><small>{target.text}</small></span></label>)}</div></Panel>
      <Panel title="Audit trail" description="Неизменяемый журнал выдачи"><div className="delivery-audit"><div><ShieldCheck size={17} /><span><strong>10:15</strong> Эксперт подтвердил разрез A–A′.</span></div><div><ShieldCheck size={17} /><span><strong>10:18</strong> Проект запасов C1 передан на review.</span></div>{published && <div><ShieldCheck size={17} /><span><strong>Сейчас</strong> Версия 12 опубликована в {selected.length} модул{selected.length === 1 ? 'ь' : 'я'}(ях).</span></div>}</div></Panel></div>
  </div>
}

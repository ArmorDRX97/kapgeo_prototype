import { Link } from '@tanstack/react-router'
import { AlertTriangle, ChartNoAxesCombined, Layers3, MapPinned, Target } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { MetricCard } from '../../shared/ui/MetricCard'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AnalyticsPage() {
  const [selected, setSelected] = useState('WELL-1042')
  return <div className="page-stack"><PageHeader eyebrow="Экспертно-аналитический модуль · AN-01" title="Аналитический обзор" description="Срез на 10 августа, 20:00: факт, модель и прогноз разделены по источнику и версии. Выбор объекта синхронизирован с картой, таблицей и evidence." meta={<Badge tone="ai" dot>As-of 10.08.2026 20:00 · 3 источника</Badge>} actions={<Link to="/analytics/decision" className="button button--primary button--md"><Target size={17} />Открыть решение</Link>} />
    <div className="metrics-grid"><MetricCard icon={ChartNoAxesCombined} label="Приемистость" value="79 м³/ч" detail="факт WELL-1042 · −3 к плану" tone="amber" /><MetricCard icon={Layers3} label="Прогноз модели" value="81 м³/ч" detail="RESULT-07 · BASE-01" tone="violet" /><MetricCard icon={AlertTriangle} label="Отклонения" value="3" detail="1 критичное в текущем scope" tone="amber" /><MetricCard icon={Target} label="Решения" value="1" detail="ожидает руководителя" tone="blue" /></div>
    <div className="analytics-grid"><Panel title="Карта и выборка" description="BLK-07-12 · слой: приемистость"><div className="analytics-map">{['WELL-1010', 'WELL-1042', 'WELL-1038', 'WELL-1046', 'WELL-1051'].map((item, index) => <button key={item} type="button" className={selected === item ? 'is-selected' : ''} style={{ left: `${18 + index * 16}%`, top: `${55 - (index % 3) * 18}%` }} onClick={() => setSelected(item)}><MapPinned size={16} /><span>{item}</span></button>)}</div><div className="analytics-legend"><i /> Норма <i className="is-warning" /> Отклонение <i className="is-model" /> Модель</div></Panel><Panel title="Inspector" description="Связанный выбор"><div className="analytics-inspector"><strong>{selected}</strong><span>Факт: {selected === 'WELL-1042' ? '79' : '84'} м³/ч · источник TECH OP-DAY-03 rev.2</span><span>Модель: 81 м³/ч · RESULT-07</span><span>План: 82 м³/ч · PLAN v3.1</span><Link to="/analytics/decision" className="text-link">Evidence и решение</Link></div></Panel></div>
    <Panel title="Выборка объектов" description="Условие: приемистость ниже плана более чем на 2 м³/ч"><div className="analytics-table"><div><span>Объект</span><span>Факт</span><span>Модель</span><span>Отклонение</span><span>Качество</span></div>{['WELL-1042', 'WELL-1046', 'WELL-1051'].map((item, index) => <button type="button" key={item} onClick={() => setSelected(item)}><strong>{item}</strong><span>{79 - index * 2} м³/ч</span><span>{81 - index} м³/ч</span><Badge tone="warning">−{3 + index}%</Badge><span>Подтверждено</span></button>)}</div></Panel>
  </div>
}

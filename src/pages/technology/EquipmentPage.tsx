import { Link } from '@tanstack/react-router'
import { Activity, AlertTriangle, CalendarClock, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const equipment = [{ id: 'EQ-NS-04', name: 'Насос НС-04', place: 'Кислотный узел', resource: 78, state: 'warning', next: 'ТО через 84 ч' }, { id: 'EQ-NS-07', name: 'Насос НС-07', place: 'Резервный контур', resource: 94, state: 'operating', next: 'ТО через 360 ч' }, { id: 'EQ-SEN-12', name: 'Датчик давления SEN-12', place: 'WELL-1042', resource: 61, state: 'warning', next: 'Поверка через 12 дн.' }]
export function EquipmentPage() {
  const [selectedId, setSelectedId] = useState('EQ-NS-04')
  const selected = equipment.find((item) => item.id === selectedId)!
  return <div className="page-stack"><PageHeader eyebrow="Технологический модуль · TECH-13–15" title="Оборудование" description="Паспорт, ресурс и история обслуживания. Риск объясняется фактическими правилами, а не только цветом статуса." meta={<Badge tone="warning" dot>2 единицы требуют внимания</Badge>} actions={<Link to="/technology/rvr/DEV-042" className="button button--secondary button--md">К РВР-042</Link>} />
    <div className="equipment-layout"><Panel title="Реестр оборудования" description="BLK-07-12 · 3 единицы"><div className="equipment-list">{equipment.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={selectedId === item.id ? 'is-selected' : ''}><Wrench size={19} /><span><strong>{item.name}</strong><small>{item.id} · {item.place}</small></span><Badge tone={item.state === 'warning' ? 'warning' : 'success'}>{item.state === 'warning' ? 'Риск' : 'В работе'}</Badge></button>)}</div></Panel><aside className="equipment-aside"><Panel title={selected.name} description={`${selected.id} · ${selected.place}`}><div className="equipment-passport"><div><span>Состояние</span><strong>{selected.state === 'warning' ? 'Требует внимания' : 'В работе'}</strong></div><div><span>Остаточный ресурс</span><strong>{selected.resource}%</strong></div><div><span>Следующее событие</span><strong>{selected.next}</strong></div></div><div className="equipment-risk"><AlertTriangle size={18} /><span><strong>Причина риска</strong>{selected.id === 'EQ-NS-04' ? 'Вибрация выше нормы 8% и ресурс ниже 80%. Используется в РВР-042.' : 'Требуется плановая поверка/обслуживание по наработке.'}</span></div></Panel><Panel title="Timeline" description="Последние события"><div className="equipment-timeline"><div><CalendarClock size={16} /><span><strong>Сегодня, 10:10</strong> Показание вибрации получено из сменного пакета.</span></div><div><Activity size={16} /><span><strong>08 авг.</strong> Плановое ТО завершено без замечаний.</span></div></div></Panel></aside></div>
  </div>
}

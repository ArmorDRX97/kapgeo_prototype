import { CheckCircle2, KeyRound, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { MetricCard } from '../../shared/ui/MetricCard'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const users = [{ name: 'Айбек Садыков', role: 'R6 Технолог', scope: 'BLK-07-12', state: 'Активен' }, { name: 'Мария Ермекова', role: 'R7 Диспетчер', scope: 'Северный участок', state: 'Активен' }, { name: 'Данияр Касымов', role: 'R12 Руководитель', scope: 'Все участки', state: 'Активен' }]
export function AdminPage() {
  const [approved, setApproved] = useState(false)
  const [selected, setSelected] = useState('Айбек Садыков')
  return <div className="page-stack"><PageHeader eyebrow="Администрирование · ADM-01–06" title="Пользователи и доступ" description="Роли, scope и effective permissions. Просмотр прав не меняет реальную сессию и предназначен для безопасной проверки настроек." meta={<Badge tone="warning" dot>{approved ? 'Заявка одобрена' : '1 заявка ожидает'}</Badge>} />
    <div className="metrics-grid"><MetricCard icon={UserRoundCog} label="Пользователи" value="42" detail="38 активны в текущем scope" tone="blue" /><MetricCard icon={ShieldCheck} label="Роли" value="14" detail="матрица прав version 5" tone="violet" /><MetricCard icon={KeyRound} label="Заявки доступа" value={approved ? '0' : '1'} detail="в ожидании решения" tone="amber" /><MetricCard icon={CheckCircle2} label="Аудит" value="100%" detail="действия доступа журналируются" tone="blue" /></div>
    <div className="admin-grid"><Panel title="Пользователи" description="Северный участок"><div className="admin-users">{users.map((user) => <button type="button" key={user.name} className={selected === user.name ? 'is-selected' : ''} onClick={() => setSelected(user.name)}><UserRoundCog size={19} /><span><strong>{user.name}</strong><small>{user.role} · {user.scope}</small></span><Badge tone="success">{user.state}</Badge></button>)}</div></Panel><aside className="admin-aside"><Panel title="Effective permissions" description={selected}><div className="permission-list"><div><span>Геология</span><Badge tone="success">Редактирование</Badge></div><div><span>Технология</span><Badge tone="success">Редактирование</Badge></div><div><span>Моделирование</span><Badge tone="warning">Просмотр</Badge></div><div><span>Администрирование</span><Badge>Нет доступа</Badge></div></div><p className="admin-note">Preview показывает итог роли и scope; наследование и запреты видны до сохранения.</p></Panel><Panel title="Заявка ACC-019" description="Доступ к моделированию · причина: review RESULT-07"><button type="button" disabled={approved} className="button button--primary button--md" onClick={() => setApproved(true)}><CheckCircle2 size={16} />{approved ? 'Одобрено' : 'Одобрить доступ'}</button>{approved && <p className="success-message">R11 добавлена роль просмотра моделирования; запись внесена в audit trail.</p>}</Panel></aside></div>
  </div>
}

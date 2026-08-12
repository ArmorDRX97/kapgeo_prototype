import { CheckCircle2, FlaskConical, Link2, ShieldCheck } from 'lucide-react'
import { verificationRecords } from '../data/flows'
import { HelpBreadcrumbs, HelpFrame } from '../ui/HelpFrame'

export function HelpVerificationPage() {
  return <HelpFrame eyebrow="Проверка руководства" title="Какие сценарии подтверждены" description="Реестр фактически открытых страниц и выполненных действий, на которых основана эта документация.">
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'Что проверено' }]} />
    <div className="verification-summary"><div><ShieldCheck size={20} /><strong>14</strong><span>ролей</span></div><div><Link2 size={20} /><strong>40</strong><span>маршрутов</span></div><div><FlaskConical size={20} /><strong>8</strong><span>ключевых действий</span></div></div>
    <div className="verification-list">{verificationRecords.map((record) => <article key={`${record.area}-${record.href}`}><CheckCircle2 size={18} /><div><h2>{record.area}</h2><p>{record.result}</p><small>Проверено: {record.checked}</small></div><a href={record.href}>Открыть страницу →</a></article>)}</div>
    <aside className="help-note"><h2>Граница проверки</h2><p>Проверка подтверждает наличие данных, переходы и локальные состояния интерфейса. Внешние корпоративные интеграции, промышленное хранение, реальный IAM и юридически значимая публикация в текущем контуре не подключены.</p></aside>
  </HelpFrame>
}

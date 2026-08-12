import { useParams } from '@tanstack/react-router'
import { roleGuides, roleGuideById } from '../data/roles'
import { CollaborationList, StepList } from '../ui/GuideBlocks'
import { HelpBreadcrumbs, HelpFrame, GuideLink } from '../ui/HelpFrame'

export function HelpRolesPage() {
  return <HelpFrame eyebrow="Ролевые руководства" title="Кто и как работает в системе" description="Все 14 профилей: ответственность, доступные разделы, рабочая последовательность и передача результата.">
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'Роли' }]} />
    <div className="role-index-grid">{roleGuides.map((role) => <a href={`/help/roles/${role.id}`} key={role.id}><span>{role.id}</span><div><h2>{role.name}</h2><p>{role.summary}</p><small>{role.modules.join(' · ')}</small></div></a>)}</div>
  </HelpFrame>
}

export function HelpRolePage() {
  const { roleId } = useParams({ strict: false })
  const role = roleGuideById[roleId ?? '']
  if (!role) return <HelpFrame title="Роль не найдена" description="Вернитесь в каталог и выберите существующий профиль."><GuideLink href="/help/roles">К списку ролей</GuideLink></HelpFrame>
  return <HelpFrame eyebrow={`${role.id} · Ролевое руководство`} title={role.name} description={role.summary} actions={<GuideLink href={role.startHref}>Открыть рабочий раздел</GuideLink>}>
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'Роли', href: '/help/roles' }, { label: role.name }]} />
    <section className="role-facts"><div><span>Профиль</span><strong>{role.person}</strong></div><div><span>Область доступа</span><strong>{role.scope}</strong></div><div><span>Разделы</span><strong>{role.modules.join(' · ')}</strong></div></section>
    <section className="help-two-columns help-two-columns--wide">
      <article className="help-note"><h2>Ответственность роли</h2><ul>{role.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article className="help-note"><h2>Как включить профиль</h2><ol><li>Откройте <a href="/profile">профиль пользователя</a>.</li><li>В поле «Работать как» выберите «{role.name}».</li><li>Проверьте область «{role.scope}» и состав меню.</li></ol></article>
    </section>
    <section className="help-section"><div className="help-section__heading"><div><p>Рабочий маршрут</p><h2>Последовательность действий</h2></div></div><StepList steps={role.steps} /></section>
    <section className="help-section"><div className="help-section__heading"><div><p>Передача результата</p><h2>С кем взаимодействует роль</h2></div></div><CollaborationList items={role.collaboratesWith} /></section>
  </HelpFrame>
}

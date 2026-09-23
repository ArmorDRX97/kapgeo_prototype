import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, ShieldCheck, UsersRound } from 'lucide-react'
import { userPersonas } from '../../entities/session/model/personas'
import { useSession } from '../../entities/session/model/sessionContext'
import { getPermissions } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const moduleLabels: Record<string, string> = {
  'bgd.view': 'БГД',
  'geology.view': 'Геология',
  'technology.view': 'Технология',
  'modeling.view': 'Моделирование',
  'analytics.view': 'Аналитика',
  'administration.view': 'Администрирование',
}

export function ProfilePage() {
  const { persona, switchPersona } = useSession()
  const visibleModules = [...getPermissions(persona)].filter((permission) => permission in moduleLabels).map((permission) => moduleLabels[permission])

  return <div className="page-stack">
    <PageHeader eyebrow="Учётная запись · PROF-01" title="Профиль и демонстрационные роли" description="Роль меняет доступные модули и операции. Переключение действует сразу и не требует повторного входа." />
    <div className="profile-grid profile-grid--roles">
      <Panel className="profile-card">
        <div className="profile-identity"><span>{persona?.initials}</span><div><h2>{persona?.name}</h2><p>{persona?.position}</p><Badge tone="success" dot>Активная сессия</Badge></div></div>
        <dl><div><dt>Роль</dt><dd>{persona?.roles.join(', ')}</dd></div><div><dt>Область</dt><dd>{persona?.scope}</dd></div><div><dt>Учётная запись</dt><dd>{persona?.id}</dd></div></dl>
        <div className="profile-module-access"><small>Доступные модули</small><div>{visibleModules.map((module) => <Badge key={module} tone="info">{module}</Badge>)}</div></div>
        {persona && <Link to={persona.homeRoute} className="button button--primary button--md profile-workspace-link">Перейти в рабочую область <ArrowRight size={16} /></Link>}
      </Panel>
      <Panel title="Сменить роль" description="Все роли из полной версии доступны для проверки сценариев и прав.">
        <div className="profile-notice"><ShieldCheck size={17} /><span>Интерфейс показывает только те модули и действия, которые разрешены выбранному профилю.</span></div>
        <label className="field profile-role-select"><span className="field__label">Работать как</span><select value={persona?.id ?? ''} onChange={(event) => switchPersona(event.target.value)}>{userPersonas.map((item) => <option key={item.id} value={item.id}>{item.roles.join(', ')} · {item.position} · {item.name}</option>)}</select></label>
        <div className="profile-persona-list" aria-label="Доступные демонстрационные роли">{userPersonas.map((item) => <button key={item.id} type="button" className={item.id === persona?.id ? 'is-active' : ''} onClick={() => switchPersona(item.id)}><span className="avatar avatar--sm">{item.initials}</span><span><strong>{item.position}</strong><small>{item.name} · {item.scope}</small></span>{item.id === persona?.id ? <Check size={17} /> : <UsersRound size={16} />}</button>)}</div>
      </Panel>
    </div>
  </div>
}

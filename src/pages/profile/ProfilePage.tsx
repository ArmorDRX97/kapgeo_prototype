import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Check, RotateCcw, ShieldCheck, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { userPersonas } from '../../entities/session/model/personas'
import { useSession } from '../../entities/session/model/sessionContext'
import { getPermissions } from '../../shared/auth/permissions'
import { resetDemoData } from '../../repository/demo/demoDataControl'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { Button } from '../../shared/ui/Button'

const moduleLabels: Record<string, string> = {
  'bgd.view': 'БГД',
  'geology.view': 'Геология',
  'technology.view': 'Технология',
  'modeling.view': 'Моделирование',
  'analytics.view': 'Аналитика',
  'administration.view': 'Администрирование',
}

export function ProfilePage() {
  const { persona, switchPersona, signOut } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const reset = async () => {
    if (resetting) return
    setResetting(true)
    setResetError('')
    try {
      await queryClient.cancelQueries()
      await resetDemoData()
      queryClient.clear()
      signOut()
      await navigate({ to: '/auth/sign-in', replace: true })
    } catch {
      setResetError('Не удалось сбросить данные. Попробуйте ещё раз.')
    } finally {
      setResetting(false)
    }
  }
  const visibleModules = [...getPermissions(persona)].filter((permission) => permission in moduleLabels).map((permission) => moduleLabels[permission])

  return <div className="page-stack">
    <PageHeader eyebrow="Учётная запись · PROF-01" title="Профиль и роли" description="Роль меняет доступные модули и операции. Переключение действует сразу и не требует повторного входа." />
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
        <div className="profile-persona-list" aria-label="Доступные роли">{userPersonas.map((item) => <button key={item.id} type="button" className={item.id === persona?.id ? 'is-active' : ''} onClick={() => switchPersona(item.id)}><span className="avatar avatar--sm">{item.initials}</span><span><strong>{item.position}</strong><small>{item.name} · {item.scope}</small></span>{item.id === persona?.id ? <Check size={17} /> : <UsersRound size={16} />}</button>)}</div>
      </Panel>
    </div>
    <Panel className="profile-reset" title="Сброс демо-данных" description="Вернуть исходные данные прототипа. Все внесённые изменения будут удалены. После сброса откроется страница авторизации.">
      <Button variant="danger" disabled={resetting} onClick={() => void reset()}><RotateCcw size={16} />{resetting ? 'Сбрасываем…' : 'Сбросить демо-данные'}</Button>
      {resetError && <p className="form-alert form-alert--error" role="alert">{resetError}</p>}
    </Panel>
  </div>
}

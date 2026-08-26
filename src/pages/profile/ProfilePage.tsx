import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, KeyRound, Languages, MonitorCog, RotateCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '../../entities/session/model/sessionContext'
import { userPersonas } from '../../entities/session/model/personas'
import { fetchPlatformPreferences, savePlatformPreferences } from '../../repository/api'
import { resetDemoData } from '../../repository/demo/demoDataControl'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function ProfilePage() {
  const { persona, switchPersona } = useSession()
  const queryClient = useQueryClient()
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const preferencesMutation = useMutation({ mutationFn: savePlatformPreferences, onSuccess: (next) => queryClient.setQueryData(['platform-preferences'], next) })
  const [isResetting, setIsResetting] = useState(false)
  const reset = async () => {
    if (!window.confirm('Сбросить все локальные демонстрационные изменения? Действие необратимо и вернёт исходный synthetic seed.')) return
    setIsResetting(true)
    try { await resetDemoData(); window.location.reload() } finally { setIsResetting(false) }
  }
  const preferences = preferencesQuery.data
  const availablePersonas = preferences?.minimumMode ? userPersonas.filter((item) => item.id === 'geo.ivanova') : userPersonas

  return <div className="page-stack">
    <PageHeader eyebrow="Профиль · PROF-01" title="Профиль и предпочтения" description="Личные параметры интерфейса, область доступа и безопасность учётной записи." />
    <div className="profile-grid">
      <Panel className="profile-card"><div className="profile-identity"><span>{persona?.initials}</span><div><h2>{persona?.name}</h2><p>{persona?.position}</p><Badge tone="success" dot>Активная сессия</Badge></div></div><dl><div><dt>Роли</dt><dd>{persona?.roles.join(', ')}</dd></div><div><dt>Область</dt><dd>{persona?.scope}</dd></div><div><dt>Учётная запись</dt><dd>{persona?.id}</dd></div></dl></Panel>
      <Panel title="Активный профиль" description="Определяет доступные роли и разделы системы."><label className="field"><span className="field__label">Работать как</span><select value={persona?.id} disabled={preferences?.minimumMode} onChange={(event) => switchPersona(event.target.value)}>{availablePersonas.map((item) => <option key={item.id} value={item.id}>{item.position} · {item.name}</option>)}</select></label><div className="profile-notice"><ShieldCheck size={17} /><span>Доступ к разделам определяется правами активного профиля.</span></div></Panel>
      {!preferences?.minimumMode && <>
        <Panel title="Предпочтения" description="Сохраняются в IndexedDB и применяются без reload"><div className="settings-list"><label><span><Languages size={18} /><span><strong>Язык</strong><small>RU/KZ/EN terminology + fallback</small></span></span><select value={preferences?.locale ?? 'ru'} disabled={!preferences} onChange={(event) => preferences && preferencesMutation.mutate({ ...preferences, locale: event.target.value as 'ru' | 'kk' | 'en' })}><option value="ru">Русский</option><option value="kk">Қазақша</option><option value="en">English</option></select></label><label><span><MonitorCog size={18} /><span><strong>Плотность</strong><small>Таблицы и рабочие области</small></span></span><select value={preferences?.density ?? 'comfortable'} disabled={!preferences} onChange={(event) => preferences && preferencesMutation.mutate({ ...preferences, density: event.target.value as 'comfortable' | 'compact' })}><option value="compact">Компактная</option><option value="comfortable">Комфортная</option></select></label><label><span><Bell size={18} /><span><strong>Уведомления</strong><small>Задачи и фоновые операции</small></span></span><input type="checkbox" defaultChecked /></label></div></Panel>
        <Panel title="Безопасность"><div className="security-summary"><span className="security-summary__icon"><KeyRound size={19} /></span><div><strong>MFA подключена</strong><p>Приложение-аутентификатор · проверено сегодня</p></div><Badge tone="success" variant="status">Защищено</Badge></div></Panel>
        <Panel title="Демонстрационные данные" description="Хранятся только в этом браузере через IndexedDB. Сброс вернёт исходный synthetic seed."><button type="button" className="button button--secondary button--md" onClick={() => void reset()} disabled={isResetting}><RotateCcw size={16} />{isResetting ? 'Сбрасываем…' : 'Сбросить демонстрационные данные'}</button></Panel>
      </>}
    </div>
  </div>
}

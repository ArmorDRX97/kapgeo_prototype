import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, CircleAlert, Database, History, Languages, MapPinned, RefreshCw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getOccurrenceName, type Deposit, type UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import {
  deleteDeposit,
  fetchDemoAuditEvents,
  fetchGeologicalMasterData,
  fetchPlatformPreferences,
  recordDepositViewed,
  savePlatformPreferences,
  updateDeposit,
} from '../../repository/api'
import { hasDepositPermission, hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { DeleteDepositDialog, DepositEditor, type DepositDependencies } from './GeologyDatabaseRegistry'
import './geobase.css'

export function GeologyDatabaseDeposit({ depositId, onBack }: {
  depositId: string
  onBack: (replace?: boolean) => void
}) {
  const { persona } = useSession()
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const auditQuery = useQuery({ queryKey: ['demo-audit-events'], queryFn: fetchDemoAuditEvents, enabled: hasPermission(persona, 'geology.bgd.audit') })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!persona || !masterQuery.data?.deposits.some((item) => item.id === depositId)) return
    void recordDepositViewed(depositId, { id: persona.id, name: persona.name }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })
    })
  }, [depositId, masterQuery.data?.deposits, persona, queryClient])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-master'] })
  const updateMutation = useMutation({
    mutationFn: ({ current, patch }: { current: Deposit; patch: UpdateDepositPatch }) => updateDeposit(current, patch),
    onSuccess: async (updated) => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })])
      setNotice(`Изменения «${updated.nameRu}» сохранены как версия ${updated.version}.`)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDeposit,
    onSuccess: async () => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })])
      onBack(true)
    },
  })
  const currentDepositMutation = useMutation({
    mutationFn: async () => {
      const preferences = preferencesQuery.data
      if (!preferences) throw new Error('Не удалось загрузить пользовательские настройки.')
      return savePlatformPreferences({
        locale: preferences.locale,
        density: preferences.density,
        contrast: preferences.contrast,
        reducedMotion: preferences.reducedMotion,
        performanceProfile: preferences.performanceProfile,
        browserWidths: preferences.browserWidths,
        helpSeen: preferences.helpSeen,
        currentDepositId: depositId,
      })
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['platform-preferences'] }),
  })

  if (masterQuery.isLoading) return <div className="page-loading"><span /><p>Открываем карточку месторождения…</p></div>

  const data = masterQuery.data
  const deposit = data?.deposits.find((item) => item.id === depositId)
  const back = () => onBack()
  const currentError = masterQuery.error ?? updateMutation.error ?? deleteMutation.error ?? currentDepositMutation.error

  if (!deposit || !data) {
    return <div className="page-stack geobase-page" data-geology-tour="bgd-detail">
      <PageHeader
        eyebrow="База геологических данных"
        title="Месторождение не найдено"
        description={`В БГД нет объекта ${depositId}. Возможно, он был удалён или ссылка устарела.`}
        actions={<Button variant="secondary" onClick={back}><ArrowLeft size={16} /> Вернуться в реестр</Button>}
      />
      {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}
      <Panel className="geobase-not-found" title="Карточка недоступна" description="Откройте реестр и выберите существующее месторождение.">
        <div className="geobase-empty"><Database size={22} /><strong>Объект не найден</strong><span>Фильтры реестра сохранены в адресе и восстановятся при возврате.</span></div>
      </Panel>
    </div>
  }

  const canEdit = hasDepositPermission(persona, 'geology.bgd.update', deposit)
  const canDelete = hasDepositPermission(persona, 'geology.bgd.delete', deposit)
  const sites = data.sites.filter((item) => item.depositId === deposit.id)
  const siteIds = new Set(sites.map((item) => item.id))
  const lenses = data.lenses.filter((item) => siteIds.has(item.siteId))
  const dependencies: DepositDependencies = {
    sites: sites.length,
    lenses: lenses.length,
    conditions: data.conditionSets.filter((item) => siteIds.has(item.siteId)).length,
    occurrences: deposit.occurrences.length,
  }
  const isCurrent = preferencesQuery.data?.currentDepositId === deposit.id
  const auditEvents = (auditQuery.data ?? []).filter((event) => event.entityId === deposit.id).slice(0, 8)
  const versionConflict = currentError?.message.includes('VERSION_CONFLICT')

  return <div className="page-stack geobase-page" data-geology-tour="bgd-detail">
    <PageHeader
      eyebrow="База геологических данных"
      title={deposit.nameRu}
      description={`Код № ${deposit.code} · ${deposit.nameKk} · ${deposit.nameEn}`}
      meta={<><Badge tone={deposit.isHidden ? 'neutral' : 'success'} dot>{deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge>{isCurrent && <Badge tone="info" dot>Текущее месторождение</Badge>}</>}
      actions={<><Button variant="secondary" disabled={isCurrent || currentDepositMutation.isPending} onClick={() => currentDepositMutation.mutate()}><CheckCircle2 size={16} /> {isCurrent ? 'Выбрано текущим' : 'Выбрать текущим'}</Button><Button variant="secondary" onClick={back}><ArrowLeft size={16} /> К реестру</Button></>}
    />

    {!canEdit && <div className="form-alert"><ShieldCheck size={17} /><span>Карточка открыта только для чтения. Изменять этот объект может геолог с назначенным доступом или администратор.</span></div>}
    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{versionConflict ? 'Карточка уже изменена в другой вкладке. Обновите данные перед повторным сохранением.' : currentError.message}</span>{versionConflict && <Button size="sm" variant="secondary" onClick={() => void refresh()}><RefreshCw size={14} /> Обновить</Button>}</div>}
    {notice && <div className="success-message" role="status"><ShieldCheck size={17} /><span><strong>БГД обновлена</strong>{notice}</span></div>}

    <section className="geobase-detail-summary">
      <Panel title="Названия и описание" description="Локализованные сведения карточки месторождения.">
        <div className="geobase-locales">
          <article><Languages size={17} /><span><small>Русский</small><strong>{deposit.nameRu}</strong><p>{deposit.descriptionRu || 'Описание не задано'}</p></span></article>
          <article><Languages size={17} /><span><small>Қазақша</small><strong>{deposit.nameKk}</strong><p>{deposit.descriptionKk || 'Сипаттама берілмеген'}</p></span></article>
          <article><Languages size={17} /><span><small>English</small><strong>{deposit.nameEn}</strong><p>{deposit.descriptionEn || 'No description'}</p></span></article>
        </div>
      </Panel>
      <Panel title="Пространственный контекст" description="Система координат является необязательным атрибутом.">
        <div className="geobase-coordinate"><MapPinned size={22} /><span><small>Система координат</small><strong>{deposit.coordinateSystem || 'Не указана'}</strong><p>{deposit.objectType === 'custom' ? deposit.customType : deposit.objectType === 'area' ? 'Площадь' : 'Месторождение'}</p></span></div>
      </Panel>
    </section>

    <Panel className="geobase-relations" title="Связанные участки и залежи" description="Дочерние объекты текущего месторождения показываются в отдельной части карточки.">
      <div className="geobase-relations__columns">
        <section><h3>Участки <Badge>{sites.length}</Badge></h3>{sites.length ? sites.map((site) => <article key={site.id}><span><strong>{site.name}</strong><small>{site.code} · версия {site.version}</small></span><Badge tone={site.status === 'active' ? 'success' : 'neutral'}>{site.status === 'active' ? 'Активен' : 'Архив'}</Badge></article>) : <p>Участки ещё не добавлены.</p>}</section>
        <section><h3>Залежи <Badge>{deposit.occurrences.length + lenses.length}</Badge></h3>{deposit.occurrences.map((occurrence) => <article key={occurrence.id}><span><strong>{getOccurrenceName(occurrence)}</strong><small>{occurrence.nameKk} · {occurrence.nameEn}</small></span><Badge>{occurrence.type}</Badge></article>)}{lenses.map((lens) => <article key={lens.id}><span><strong>{lens.name}</strong><small>{lens.code} · участок {data.sites.find((site) => site.id === lens.siteId)?.name ?? '—'}</small></span><Badge tone={lens.status === 'active' ? 'success' : 'neutral'}>{lens.status === 'active' ? 'Активна' : 'Архив'}</Badge></article>)}{!deposit.occurrences.length && !lenses.length && <p>Залежи ещё не добавлены.</p>}</section>
      </div>
    </Panel>

    <DepositEditor
      key={`${deposit.id}-${deposit.version}`}
      deposit={deposit}
      canEdit={canEdit}
      canDelete={canDelete}
      pending={updateMutation.isPending || deleteMutation.isPending}
      dependencies={dependencies}
      onSave={(patch) => { setNotice(null); updateMutation.mutate({ current: deposit, patch }) }}
      onDelete={() => { setNotice(null); setDeleteOpen(true) }}
    />

    {hasPermission(persona, 'geology.bgd.audit') && <Panel title="Аудит месторождения" description="Последние операции создания, изменения и удаления записываются автоматически." action={<History size={18} />}>
      {auditQuery.isLoading ? <p className="geobase-muted">Загружаем события…</p> : auditEvents.length ? <div className="geobase-audit">{auditEvents.map((event) => <article key={event.id}><span><strong>{event.eventType}</strong><small>{event.actor.name}</small></span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('ru-RU')}</time></article>)}</div> : <p className="geobase-muted">Событий по этому месторождению пока нет.</p>}
    </Panel>}

    {deleteOpen && <DeleteDepositDialog
      deposit={deposit}
      dependencies={dependencies}
      pending={deleteMutation.isPending}
      error={deleteMutation.error?.message}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => deleteMutation.mutate(deposit)}
    />}
  </div>
}

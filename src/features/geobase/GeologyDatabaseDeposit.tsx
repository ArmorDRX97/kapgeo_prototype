import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Check, CircleAlert, Database, History, Languages, Mountain, PencilLine, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildConditionLimits, getDepositName, type ConditionSet, type Deposit, type UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import {
  deleteDeposit,
  fetchDemoAuditEvents,
  fetchGeologicalMasterData,
  fetchPlatformPreferences,
  savePlatformPreferences,
  recordDepositViewed,
  saveConditionSet,
  updateDeposit,
} from '../../repository/api'
import { hasDepositPermission, hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { DeleteDepositDialog, DepositEditor, type DepositDependencies } from './GeologyDatabaseRegistry'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { DepositCollections } from './DepositCollections'
import './geobase.css'

export function GeologyDatabaseDeposit({ depositId, onDeleted, onOpenDeposit }: {
  depositId: string
  onDeleted: () => void
  onOpenDeposit: (depositId: string) => void
}) {
  const { persona } = useSession()
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const auditQuery = useQuery({ queryKey: ['demo-audit-events'], queryFn: fetchDemoAuditEvents, enabled: hasPermission(persona, 'geology.bgd.audit') })
  const [editOpen, setEditOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [limitsCondition, setLimitsCondition] = useState<ConditionSet | null>(null)

  useEffect(() => {
    if (!persona || !masterQuery.data?.deposits.some((item) => item.id === depositId)) return
    void recordDepositViewed(depositId, { id: persona.id, name: persona.name }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })
    })
  }, [depositId, masterQuery.data?.deposits, persona, queryClient])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-master'] })

  const saveLimitsMutation = useMutation({
    mutationFn: (input: Omit<ConditionSet, 'id'>) => saveConditionSet(input),
    onSuccess: async () => {
      await refresh()
      setLimitsCondition(null)
      setNotice('Кондиционные лимиты сохранены.')
    },
  })
  const switchDepositMutation = useMutation({
    mutationFn: async (nextDepositId: string) => {
      const preferences = await fetchPlatformPreferences()
      return savePlatformPreferences({
        locale: preferences.locale, density: preferences.density, contrast: preferences.contrast,
        reducedMotion: preferences.reducedMotion, currentDepositId: nextDepositId,
      })
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(['platform-preferences'], preferences)
      setSwitchOpen(false)
      onOpenDeposit(preferences.currentDepositId!)
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ current, patch }: { current: Deposit; patch: UpdateDepositPatch }) => updateDeposit(current, patch),
    onSuccess: async (updated) => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })])
      setEditOpen(false)
      setNotice(`Изменения «${updated.nameRu}» сохранены.`)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDeposit,
    onSuccess: async () => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })])
      onDeleted()
    },
  })

  if (masterQuery.isLoading) return <div className="page-loading"><span /><p>Открываем карточку месторождения…</p></div>

  const data = masterQuery.data
  const deposit = data?.deposits.find((item) => item.id === depositId)
  const currentError = masterQuery.error
    ?? updateMutation.error
    ?? deleteMutation.error
    ?? saveLimitsMutation.error

  if (!deposit || !data) {
    return <div className="page-stack geobase-page">
      <PageHeader
        eyebrow="База геологических данных"
        title="Месторождение не найдено"
        description={`В БГД нет объекта ${depositId}. Возможно, он был удалён или ссылка устарела.`}
      />
      {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}
      <Panel className="geobase-not-found" title="Карточка недоступна" description="Выберите существующее месторождение в панели слева.">
        <div className="geobase-empty"><Database size={22} /><strong>Объект не найден</strong><span>Откройте доступную карточку через селектор месторождения.</span></div>
      </Panel>
    </div>
  }

  const canEdit = hasDepositPermission(persona, 'geology.bgd.update', deposit)
  const canDelete = hasDepositPermission(persona, 'geology.bgd.delete', deposit)
  const sites = data.sites.filter((item) => item.depositId === deposit.id)
  const depositCondition = data.conditionSets.find((item) => item.depositId === deposit.id)
  const dependencies: DepositDependencies = {
    sites: sites.length,
    lenses: 0,
    conditions: depositCondition ? 1 : 0,
    occurrences: deposit.occurrences.length,
  }
  const auditEvents = (auditQuery.data ?? []).filter((event) => event.entityId === deposit.id)
  const canViewAudit = hasPermission(persona, 'geology.bgd.audit')

  return <div className="page-stack geobase-page geobase-overview">
    <PageHeader
      eyebrow="База геологических данных"
      title={deposit.nameRu}
      description={`Код № ${deposit.code} · ${deposit.nameKk} · ${deposit.nameEn}`}
      meta={<Badge tone={deposit.status === 'archived' || deposit.isHidden ? 'neutral' : 'success'} dot>{deposit.status === 'archived' ? 'Архив' : deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge>}
      actions={<>
        {canEdit && <Button variant="secondary" disabled={deposit.status === 'archived'} onClick={() => { updateMutation.reset(); setEditOpen(true) }}><PencilLine size={17} />Редактировать</Button>}
        <Button variant="secondary" onClick={() => { switchDepositMutation.reset(); setSwitchOpen(true) }}><ArrowRightLeft size={17} />Сменить месторождение</Button>
      </>}
    />

    {!canEdit && <div className="form-alert"><ShieldCheck size={17} /><span>Карточка открыта только для чтения. Изменять этот объект может геолог с назначенным доступом или администратор.</span></div>}
    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}
    {notice && <div className="success-message" role="status"><ShieldCheck size={17} /><span><strong>БГД обновлена</strong>{notice}</span></div>}

    <div className="geobase-overview__content">
      <div className="geobase-detail-summary">
        <Panel title="Названия и описание">
          <div className="geobase-locales">
            <article><Languages size={17} /><span><small>Русский</small><strong>{deposit.nameRu}</strong><p>{deposit.descriptionRu || 'Описание не задано'}</p></span></article>
            <article><Languages size={17} /><span><small>Қазақша</small><strong>{deposit.nameKk}</strong><p>{deposit.descriptionKk || 'Сипаттама берілмеген'}</p></span></article>
            <article><Languages size={17} /><span><small>English</small><strong>{deposit.nameEn}</strong><p>{deposit.descriptionEn || 'No description'}</p></span></article>
          </div>
        </Panel>
        <Panel title="Сведения об объекте">
          <dl className="geobase-object-facts">
            <div><dt>Код месторождения</dt><dd>№ {deposit.code}</dd></div>
            <div><dt>Тип объекта</dt><dd>{deposit.objectType === 'custom' ? deposit.customType || 'Другой тип' : deposit.objectType === 'area' ? 'Площадь' : 'Месторождение'}</dd></div>
            <div><dt>Система координат</dt><dd>{deposit.coordinateSystem || 'Не указана'}</dd></div>
            <div><dt>Использование</dt><dd>{deposit.isHidden ? 'Скрыто из списков выбора' : 'Используется'}</dd></div>
          </dl>
        </Panel>
      </div>

      <DepositCollections deposit={deposit} sites={sites} canEdit={canEdit} canDelete={canDelete} />

      <Panel title={`Кондиционные лимиты ${deposit.nameRu}`} action={<Button size="sm" variant="secondary" onClick={() => { saveLimitsMutation.reset(); setLimitsCondition(depositCondition ?? getEmptyConditionSet(deposit.id)) }}><PencilLine size={16} />Изменить</Button>}>
        <dl className="geobase-condition-values">{(depositCondition ?? getEmptyConditionSet(deposit.id)).limits.map((limit) => <div key={limit.id}>
          <dt>{limit.parameter}</dt><dd>{limit.value || 'Не задано'}{limit.value && limit.unit && <small>{limit.unit}</small>}</dd>
        </div>)}</dl>
      </Panel>

      {canViewAudit && <Panel title="Аудит месторождения" action={<History size={18} />}>
        {auditQuery.isLoading ? <p className="geobase-muted">Загружаем события…</p> : auditQuery.isError ? <div className="form-alert form-alert--error" role="alert">{auditQuery.error.message}<Button size="sm" variant="secondary" onClick={() => void auditQuery.refetch()}>Повторить</Button></div> : auditEvents.length ? <div className="geobase-audit">{auditEvents.map((event) => <article key={event.id}><span><strong>{event.eventType}</strong><small>{event.actor.name}</small></span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('ru-RU')}</time></article>)}</div> : <p className="geobase-muted">Событий по этому месторождению пока нет.</p>}
      </Panel>}
    </div>

    {editOpen && <WorkspaceDialog title={`Редактирование месторождения ${deposit.nameRu}`} pending={updateMutation.isPending} onClose={() => setEditOpen(false)}>
      {updateMutation.error && <div className="form-alert form-alert--error" role="alert">{updateMutation.error.message}</div>}
      <DepositEditor key={deposit.id} deposit={deposit} canEdit={canEdit} canDelete={canDelete}
        pending={updateMutation.isPending || deleteMutation.isPending}
        onSave={(patch) => { setNotice(null); updateMutation.mutate({ current: deposit, patch }) }}
        onDelete={() => { setEditOpen(false); setNotice(null); setDeleteOpen(true) }} />
    </WorkspaceDialog>}
    {switchOpen && <WorkspaceDialog title="Сменить месторождение" pending={switchDepositMutation.isPending} onClose={() => setSwitchOpen(false)} footer={<Button variant="secondary" disabled={switchDepositMutation.isPending} onClick={() => setSwitchOpen(false)}>Отменить</Button>}>
      {switchDepositMutation.error && <div className="form-alert form-alert--error" role="alert">{switchDepositMutation.error.message}</div>}
      <div className="geobase-deposit-picker">{data.deposits.filter((item) => !item.isHidden).map((item) => <button key={item.id} type="button" disabled={switchDepositMutation.isPending} aria-current={item.id === deposit.id ? 'true' : undefined}
        onClick={() => { if (item.id !== deposit.id) switchDepositMutation.mutate(item.id); else setSwitchOpen(false) }}>
        <Mountain size={20} /><span><strong>{getDepositName(item)}</strong><small>Месторождение № {item.code}</small></span>{item.id === deposit.id && <Check size={18} aria-label="Текущее месторождение" />}
      </button>)}</div>
      {!data.deposits.some((item) => !item.isHidden) && <p className="geobase-muted">Доступных месторождений пока нет.</p>}
    </WorkspaceDialog>}
    {deleteOpen && <DeleteDepositDialog
      deposit={deposit}
      dependencies={dependencies}
      pending={deleteMutation.isPending}
      error={deleteMutation.error?.message}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => deleteMutation.mutate(deposit)}
    />}
    {limitsCondition?.depositId === deposit.id && <ConditionLimitsDialog
      key={limitsCondition.id}
      canEdit={canEdit}
      input={limitsCondition}
      depositName={deposit.nameRu}
      onClose={() => setLimitsCondition(null)}
      onSave={(next) => saveLimitsMutation.mutate(next)}
      pending={saveLimitsMutation.isPending}
      error={saveLimitsMutation.error?.message}
    />}
  </div>
}

function getEmptyConditionSet(depositId: string): ConditionSet {
  return {
    id: `CONDITIONS-${depositId}`,
    depositId,
    density: 0,
    balanceThreshold: 0,
    offBalanceThreshold: 0,
    azimuthCorrection: 0,
    geometryTolerance: 0,
    limits: buildConditionLimits(''),
  }
}

function ConditionLimitsDialog({ input, depositName, canEdit, onClose, onSave, pending, error }: {
  input: ConditionSet
  depositName: string
  canEdit: boolean
  onClose: () => void
  onSave: (next: Omit<ConditionSet, 'id'>) => void
  pending: boolean
  error?: string
}) {
  const [condition, setCondition] = useState(input)
  const dialogRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)')?.focus()
    return () => previousFocus?.focus({ preventScroll: true })
  }, [])

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <form ref={dialogRef} className="geobase-dialog geobase-dialog--limits" role="dialog" aria-modal="true" aria-labelledby="condition-limits-title"
      onSubmit={(event) => { event.preventDefault(); if (canEdit && !pending) onSave(condition) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); if (!pending) onClose() }
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]
        const first = controls[0]; const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}>
      <header><div><span><SlidersHorizontal size={20} /></span><div><h2 id="condition-limits-title">Кондиционные лимиты {depositName}</h2></div></div></header>
      <div className="geobase-dialog__body">
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
        {!canEdit && <div className="form-alert">Нет прав для редактирования кондиционных лимитов.</div>}
        <div className="geobase-limits-table">
          <div className="geobase-limits-table__head"><span>Параметр</span><span>Значение</span><span>Ед. изм.</span></div>
          {condition.limits.map((limit) => <div key={limit.id} className="geobase-limits-table__row">
            <label htmlFor={`condition-limit-${limit.id}`}>{limit.parameter}</label>
            <span><input id={`condition-limit-${limit.id}`} type="text" value={limit.value} disabled={!canEdit || pending} onChange={(event) => setCondition({
              ...condition,
              limits: condition.limits.map((item) => item.id === limit.id ? { ...item, value: event.target.value } : item),
            })} /></span>
            <small>{limit.unit ?? '—'}</small>
          </div>)}
        </div>
      </div>
      <footer>
        <Button type="submit" disabled={!canEdit || pending}>Сохранить</Button>
        <Button disabled={pending} variant="secondary" onClick={onClose}>Отменить</Button>
      </footer>
    </form>
  </div>
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, CheckCircle2, CircleAlert, Database, History, Info, Languages, Layers3, MapPinned, PencilLine, Plus, RadioTower, RefreshCw, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { buildConditionLimits, getOccurrenceName, type ConditionSet, type Deposit, type GeologicalSite, type UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import {
  approveConditionSet,
  createConditionSet,
  createSite,
  deleteDeposit,
  fetchDemoAuditEvents,
  fetchGeologicalMasterData,
  fetchPlatformPreferences,
  fetchWells,
  createConditionSetVersion,
  publishConditionSet,
  recordDepositViewed,
  saveConditionSet,
  savePlatformPreferences,
  updateDeposit,
} from '../../repository/api'
import { hasDepositPermission, hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { DeleteDepositDialog, DepositEditor, type DepositDependencies } from './GeologyDatabaseRegistry'
import type { DepositSection } from './model/depositSection'
import './geobase.css'

type DepositSectionTab = {
  id: DepositSection
  label: string
  count?: number
}

export function GeologyDatabaseDeposit({ depositId, activeSection, onSectionChange, onBack, onCreateWell, onOpenWell }: {
  depositId: string
  activeSection: DepositSection
  onSectionChange: (section: DepositSection) => void
  onBack: (replace?: boolean) => void
  onCreateWell: () => void
  onOpenWell: (wellId: string) => void
}) {
  const { persona } = useSession()
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const auditQuery = useQuery({ queryKey: ['demo-audit-events'], queryFn: fetchDemoAuditEvents, enabled: hasPermission(persona, 'geology.bgd.audit') })
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [limitsCondition, setLimitsCondition] = useState<{ site: GeologicalSite; condition: ConditionSet; isCreate: boolean } | null>(null)
  const [siteCreateOpen, setSiteCreateOpen] = useState(false)

  useEffect(() => {
    if (!persona || !masterQuery.data?.deposits.some((item) => item.id === depositId)) return
    void recordDepositViewed(depositId, { id: persona.id, name: persona.name }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })
    })
  }, [depositId, masterQuery.data?.deposits, persona, queryClient])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-master'] })

  const createLimitsMutation = useMutation({
    mutationFn: (next: Omit<ConditionSet, 'id' | 'status' | 'version'>) => createConditionSet(next),
    onSuccess: async (created, input) => {
      const openSite = limitsCondition?.site
      await refresh()
      if (openSite) setLimitsCondition({ site: openSite, condition: created, isCreate: false })
      setNotice(`Набор кондиций ${input.code} сохранён как черновик v${created.version}.`)
    },
  })
  const createSiteMutation = useMutation({
    mutationFn: createSite,
    onSuccess: async (site) => {
      await refresh()
      setSiteCreateOpen(false)
      setNotice(`Участок «${site.name}» добавлен. Теперь для него можно создать набор кондиционных лимитов.`)
    },
  })
  const saveLimitsMutation = useMutation({
    mutationFn: ({ current, next }: { current: ConditionSet; next: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'> }) => saveConditionSet(current, next),
    onSuccess: async (updated) => {
      await refresh()
      setLimitsCondition((current) => current ? { ...current, condition: updated, isCreate: false } : null)
      setNotice(`Набор кондиций сохранён как черновик v${updated.version}.`)
    },
  })
  const createLimitsVersionMutation = useMutation({
    mutationFn: (source: ConditionSet) => createConditionSetVersion(source),
    onSuccess: async (next, source) => {
      await refresh()
      const site = data?.sites.find((item) => item.id === source.siteId)
      if (site) setLimitsCondition({ site, condition: next, isCreate: false })
      setNotice(`Создана новая версия кондиций v${next.version} (черновик).`)
    },
  })
  const approveLimitsMutation = useMutation({
    mutationFn: (current: ConditionSet) => approveConditionSet(current),
    onSuccess: async (updated) => {
      await refresh()
      setLimitsCondition((current) => current ? { ...current, condition: updated, isCreate: false } : null)
      setNotice(`Набор кондиций утверждён как v${updated.version}.`)
    },
  })
  const publishLimitsMutation = useMutation({
    mutationFn: (current: ConditionSet) => {
      if (!window.confirm('Опубликовать набор кондиционных лимитов? Это завершит цикл согласования.')) return Promise.reject(new Error('Публикация отменена пользователем.'))
      return publishConditionSet(current)
    },
    onError: () => undefined,
    onSuccess: async (updated) => {
      await refresh()
      setLimitsCondition((current) => current ? { ...current, condition: updated, isCreate: false } : null)
      setNotice(`Набор кондиций опубликован как v${updated.version}.`)
    },
  })
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
        minimumMode: preferences.minimumMode,
        currentDepositId: depositId,
      })
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['platform-preferences'] }),
  })

  if (masterQuery.isLoading) return <div className="page-loading"><span /><p>Открываем карточку месторождения…</p></div>

  const data = masterQuery.data
  const deposit = data?.deposits.find((item) => item.id === depositId)
  const back = () => onBack()
  const currentError = masterQuery.error
    ?? updateMutation.error
    ?? deleteMutation.error
    ?? currentDepositMutation.error
    ?? createLimitsMutation.error
    ?? saveLimitsMutation.error
    ?? createLimitsVersionMutation.error
    ?? approveLimitsMutation.error
    ?? publishLimitsMutation.error
    ?? createSiteMutation.error

  if (!deposit || !data) {
    return <div className="page-stack geobase-page" data-geology-tour="bgd-detail">
      <PageHeader
        eyebrow="База геологических данных"
        title="Месторождение не найдено"
        description={`В БГД нет объекта ${depositId}. Возможно, он был удалён или ссылка устарела.`}
        actions={<Button variant="secondary" onClick={back}><ArrowLeft size={16} /> К месторождениям</Button>}
      />
      {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}
      <Panel className="geobase-not-found" title="Карточка недоступна" description="Откройте список и выберите существующее месторождение.">
        <div className="geobase-empty"><Database size={22} /><strong>Объект не найден</strong><span>Вернитесь к месторождениям и откройте доступную карточку.</span></div>
      </Panel>
    </div>
  }

  const canEdit = hasDepositPermission(persona, 'geology.bgd.update', deposit)
  const canDelete = hasDepositPermission(persona, 'geology.bgd.delete', deposit)
  const sites = data.sites.filter((item) => item.depositId === deposit.id)
  const siteIds = new Set(sites.map((item) => item.id))
  const lenses = data.lenses.filter((item) => siteIds.has(item.siteId))
  const conditionsBySite = sites.map((site) => {
    const condition = data.conditionSets
      .filter((item) => item.siteId === site.id)
      .sort((left, right) => getConditionStatusPriority(right.status) - getConditionStatusPriority(left.status) || right.version - left.version)[0]
    return { site, condition: condition ?? null }
  })
  const dependencies: DepositDependencies = {
    sites: sites.length,
    lenses: lenses.length,
    conditions: data.conditionSets.filter((item) => siteIds.has(item.siteId)).length,
    occurrences: deposit.occurrences.length,
  }
  const isCurrent = preferencesQuery.data?.currentDepositId === deposit.id
  const auditEvents = (auditQuery.data ?? []).filter((event) => event.entityId === deposit.id).slice(0, 8)
  const depositWells = (wellsQuery.data ?? []).filter((well) => (well.bgd?.depositId ?? 'DEP-SARYTAU') === deposit.id)
  const versionConflict = currentError?.message.includes('VERSION_CONFLICT')
  const canViewAudit = hasPermission(persona, 'geology.bgd.audit')
  const sectionTabs: DepositSectionTab[] = [
    { id: 'overview', label: 'Основные сведения' },
    { id: 'relations', label: 'Участки и залежи', count: sites.length + deposit.occurrences.length + lenses.length },
    { id: 'conditions', label: 'Кондиционные лимиты', count: conditionsBySite.filter((item) => item.condition).length },
    { id: 'wells', label: 'Скважины', count: depositWells.length },
    { id: 'edit', label: 'Редактирование' },
    ...(canViewAudit ? [{ id: 'audit' as const, label: 'Аудит', count: auditEvents.length }] : []),
  ]
  const selectedSection = sectionTabs.some((tab) => tab.id === activeSection) ? activeSection : 'overview'
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = sectionTabs.findIndex((tab) => tab.id === selectedSection)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? sectionTabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + sectionTabs.length) % sectionTabs.length
    const nextSection = sectionTabs[nextIndex]?.id ?? 'overview'
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#deposit-tab-${nextSection}`)?.focus()
    onSectionChange(nextSection)
  }

  return <div className="page-stack geobase-page" data-geology-tour="bgd-detail">
    <PageHeader
      eyebrow="База геологических данных"
      title={deposit.nameRu}
      description={`Код № ${deposit.code} · ${deposit.nameKk} · ${deposit.nameEn}`}
      meta={<><Badge tone={deposit.isHidden ? 'neutral' : 'success'} dot>{deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge>{isCurrent && <Badge tone="info" dot>Текущее месторождение</Badge>}</>}
      actions={<><Button variant="secondary" disabled={isCurrent || currentDepositMutation.isPending} onClick={() => currentDepositMutation.mutate()}><CheckCircle2 size={16} /> {isCurrent ? 'Выбрано текущим' : 'Выбрать текущим'}</Button><Button variant="secondary" onClick={back}><ArrowLeft size={16} /> К месторождениям</Button></>}
    />

    {!canEdit && <div className="form-alert"><ShieldCheck size={17} /><span>Карточка открыта только для чтения. Изменять этот объект может геолог с назначенным доступом или администратор.</span></div>}
    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{versionConflict ? 'Карточка уже изменена в другой вкладке. Обновите данные перед повторным сохранением.' : currentError.message}</span>{versionConflict && <Button size="sm" variant="secondary" onClick={() => void refresh()}><RefreshCw size={14} /> Обновить</Button>}</div>}
    {notice && <div className="success-message" role="status"><ShieldCheck size={17} /><span><strong>БГД обновлена</strong>{notice}</span></div>}

    <nav className="geobase-detail-tabs" role="tablist" aria-label="Разделы карточки месторождения" data-geology-tour="bgd-tabs">
      {sectionTabs.map((tab) => <DepositSectionTabButton
        key={tab.id}
        tab={tab}
        selected={selectedSection === tab.id}
        onActivate={() => onSectionChange(tab.id)}
        onKeyDown={handleTabKeyDown}
      />)}
    </nav>

    <div className="geobase-tab-content">
      <section id="deposit-panel-overview" className="geobase-tab-panel" role="tabpanel" aria-labelledby="deposit-tab-overview" hidden={selectedSection !== 'overview'}>
        <div className="geobase-detail-summary">
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
        </div>
      </section>

      <section id="deposit-panel-relations" className="geobase-tab-panel" role="tabpanel" aria-labelledby="deposit-tab-relations" hidden={selectedSection !== 'relations'}>
      <Panel className="geobase-relations" title="Связанные участки и залежи" description="Дочерние объекты текущего месторождения показываются в отдельной части карточки.">
        <div className="geobase-relations__columns">
          <section><h3>Участки <Badge>{sites.length}</Badge>{canEdit && <Button size="sm" variant="secondary" onClick={() => setSiteCreateOpen(true)}><Plus size={14} /> Добавить</Button>}</h3>{sites.length ? sites.map((site) => <article key={site.id}><span><strong>{site.name}</strong><small>{site.code} · версия {site.version}</small></span><Badge tone={site.status === 'active' ? 'success' : 'neutral'}>{site.status === 'active' ? 'Активен' : 'Архив'}</Badge></article>) : <p>Участки ещё не добавлены.</p>}</section>
          <section><h3>Залежи <Badge>{deposit.occurrences.length + lenses.length}</Badge></h3>{deposit.occurrences.map((occurrence) => <article key={occurrence.id}><span><strong>{getOccurrenceName(occurrence)}</strong><small>{occurrence.nameKk} · {occurrence.nameEn}</small></span><Badge>{occurrence.type}</Badge></article>)}{lenses.map((lens) => <article key={lens.id}><span><strong>{lens.name}</strong><small>{lens.code} · участок {data.sites.find((site) => site.id === lens.siteId)?.name ?? '—'}</small></span><Badge tone={lens.status === 'active' ? 'success' : 'neutral'}>{lens.status === 'active' ? 'Активна' : 'Архив'}</Badge></article>)}{!deposit.occurrences.length && !lenses.length && <p>Залежи ещё не добавлены.</p>}</section>
        </div>
      </Panel>
      </section>

      <section id="deposit-panel-conditions" className="geobase-tab-panel" role="tabpanel" aria-labelledby="deposit-tab-conditions" hidden={selectedSection !== 'conditions'}>
        <Panel className="geobase-condition-limits" title="Кондиционные лимиты" description="Действующие параметры по участкам." action={<Badge tone={conditionsBySite.some((item) => item.condition) ? 'success' : 'neutral'}>{conditionsBySite.some((item) => item.condition) ? `${conditionsBySite.filter((item) => item.condition).length} набор` : 'Нет набора'}</Badge>}>
          <div className="geobase-condition-limits__list">{conditionsBySite.length ? conditionsBySite.map(({ site, condition }) => (
            <article key={site.id}>
              <span className="geobase-condition-limits__icon"><SlidersHorizontal size={18} /></span>
              <div>
                <strong>{site.name}</strong>
                {condition ? <>
                  <small>{condition.code} · действует с {new Date(`${condition.effectiveFrom}T00:00:00`).toLocaleDateString('ru-RU')} · версия {condition.version}</small>
                  <p>Плотность {condition.limits?.find((item) => item.id === 'rock-density')?.value ?? condition.density.toLocaleString('ru-RU')} {condition.limits?.find((item) => item.id === 'rock-density')?.unit ?? 'т/м³'} · бортовое содержание {condition.limits?.find((item) => item.id === 'uranium-cutoff')?.value ?? condition.balanceThreshold} м%</p>
                </> : <small>Набор кондиций для участка ещё не создан.</small>}
              </div>
              <Badge tone={condition?.status === 'published' ? 'success' : condition?.status === 'approved' ? 'info' : condition?.status === 'draft' ? 'warning' : 'neutral'} dot>{condition?.status === 'published' ? 'Опубликован' : condition?.status === 'approved' ? 'Утверждён' : condition?.status === 'draft' ? 'Ожидает утверждения' : 'Не задан'}</Badge>
              <Button size="sm" variant={condition?.status === 'draft' ? 'primary' : 'secondary'} className={condition?.status === 'draft' ? 'geobase-condition-limits__review-button' : undefined} onClick={() => setLimitsCondition({ site, condition: condition ?? getEmptyConditionSet(site), isCreate: !condition })}>
                {condition?.status === 'draft' ? <><BadgeCheck size={15} /> Открыть и утвердить</> : condition ? 'Полный перечень' : 'Создать набор'}
              </Button>
            </article>
          )) : <div className="geobase-empty"><SlidersHorizontal size={22} /><strong>Участки отсутствуют</strong><span>Добавьте участки, затем создайте кондиционные лимиты.</span></div>}</div>
        </Panel>
      </section>

      <section id="deposit-panel-wells" className="geobase-tab-panel" role="tabpanel" aria-labelledby="deposit-tab-wells" hidden={selectedSection !== 'wells'}>
        <Panel className="geobase-wells" title="Скважины" description="Скважины создаются и ведутся в контексте текущего месторождения." action={hasPermission(persona, 'geology.bgd.well.create') ? <Button size="sm" onClick={onCreateWell}><Plus size={15} /> Создать скважину</Button> : undefined}>
          {wellsQuery.isLoading ? <div className="skeleton skeleton--list" /> : depositWells.length ? <div className="geobase-well-list">{depositWells.map((well) => <button type="button" key={well.id} onClick={() => onOpenWell(well.id)}><RadioTower size={18} /><span><strong>Скважина {well.code}</strong><small>{well.type} · {well.profile} · глубина {well.depth.toLocaleString('ru-RU')} м</small></span><Badge tone={well.status === 'Работает' ? 'success' : well.status === 'Отключена' ? 'neutral' : 'warning'} dot>{well.status}</Badge></button>)}</div> : <div className="geobase-empty"><RadioTower size={22} /><strong>Скважин пока нет</strong><span>Создайте первую скважину, чтобы продолжить наполнение месторождения.</span></div>}
        </Panel>
      </section>

      <section id="deposit-panel-edit" className="geobase-tab-panel" role="tabpanel" aria-labelledby="deposit-tab-edit" hidden={selectedSection !== 'edit'}>
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
      </section>

      {canViewAudit && <section id="deposit-panel-audit" className="geobase-tab-panel" role="tabpanel" aria-labelledby="deposit-tab-audit" hidden={selectedSection !== 'audit'}>
        <Panel title="Аудит месторождения" description="Последние операции создания, изменения и удаления записываются автоматически." action={<History size={18} />}>
          {auditQuery.isLoading ? <p className="geobase-muted">Загружаем события…</p> : auditEvents.length ? <div className="geobase-audit">{auditEvents.map((event) => <article key={event.id}><span><strong>{event.eventType}</strong><small>{event.actor.name}</small></span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('ru-RU')}</time></article>)}</div> : <p className="geobase-muted">Событий по этому месторождению пока нет.</p>}
        </Panel>
      </section>}
    </div>

    {deleteOpen && <DeleteDepositDialog
      deposit={deposit}
      dependencies={dependencies}
      pending={deleteMutation.isPending}
      error={deleteMutation.error?.message}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => deleteMutation.mutate(deposit)}
    />}
    {limitsCondition && <ConditionLimitsDialog
      key={`${limitsCondition.condition.id}-${limitsCondition.condition.version}-${limitsCondition.isCreate ? 'new' : 'edit'}`}
      canEdit={canEdit}
      input={limitsCondition}
      onClose={() => setLimitsCondition(null)}
      onCreate={(next) => createLimitsMutation.mutate(next)}
      onSave={(patch) => saveLimitsMutation.mutate(patch)}
      onCreateVersion={(source) => createLimitsVersionMutation.mutate(source)}
      onApprove={(source) => approveLimitsMutation.mutate(source)}
      onPublish={(source) => publishLimitsMutation.mutate(source)}
      pending={createLimitsMutation.isPending || saveLimitsMutation.isPending || createLimitsVersionMutation.isPending || approveLimitsMutation.isPending || publishLimitsMutation.isPending}
    />}
    {siteCreateOpen && <CreateSiteDialog
      deposit={deposit}
      pending={createSiteMutation.isPending}
      onClose={() => setSiteCreateOpen(false)}
      onCreate={(input) => { setNotice(null); createSiteMutation.mutate(input) }}
    />}
  </div>
}

function DepositSectionIcon({ section }: { section: DepositSection }) {
  if (section === 'overview') return <Info size={17} />
  if (section === 'relations') return <Layers3 size={17} />
  if (section === 'conditions') return <SlidersHorizontal size={17} />
  if (section === 'wells') return <RadioTower size={17} />
  if (section === 'edit') return <PencilLine size={17} />
  return <History size={17} />
}

function DepositSectionTabButton({ tab, selected, onActivate, onKeyDown }: {
  tab: DepositSectionTab
  selected: boolean
  onActivate: () => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selected) buttonRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected])

  return <button
    ref={buttonRef}
    id={`deposit-tab-${tab.id}`}
    type="button"
    role="tab"
    aria-selected={selected}
    aria-controls={`deposit-panel-${tab.id}`}
    tabIndex={selected ? 0 : -1}
    className={selected ? 'is-active' : ''}
    onClick={onActivate}
    onKeyDown={onKeyDown}
  >
    <DepositSectionIcon section={tab.id} />
    <span>{tab.label}</span>
    {tab.count !== undefined && <Badge>{tab.count}</Badge>}
  </button>
}

function CreateSiteDialog({ deposit, pending, onClose, onCreate }: {
  deposit: Deposit
  pending: boolean
  onClose: () => void
  onCreate: (input: Pick<GeologicalSite, 'depositId' | 'code' | 'name'>) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '-')
  const canSubmit = Boolean(normalizedCode && name.trim())

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog geobase-dialog--site" role="dialog" aria-modal="true" aria-labelledby="site-create-title">
      <header><div><span><MapPinned size={20} /></span><div><h2 id="site-create-title">Добавить участок</h2><p>Участок будет создан внутри месторождения «{deposit.nameRu}».</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму создания участка"><X size={19} /></button></header>
      <form className="geobase-site-form" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onCreate({ depositId: deposit.id, code: normalizedCode, name: name.trim() }) }}>
        <label className="field"><span>Код участка</span><input autoFocus value={code} disabled={pending} onChange={(event) => setCode(event.target.value)} placeholder="Например, SOUTH" required /><small>Код нельзя будет изменить после создания.</small></label>
        <label className="field"><span>Наименование участка</span><input value={name} disabled={pending} onChange={(event) => setName(event.target.value)} placeholder="Например, Южный" required /></label>
      </form>
      <footer><span>После создания участка для него станет доступно заполнение кондиционных лимитов.</span><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={!canSubmit || pending} onClick={() => onCreate({ depositId: deposit.id, code: normalizedCode, name: name.trim() })}><Plus size={15} /> Создать участок</Button></footer>
    </section>
  </div>
}

function getEmptyConditionSet(site: GeologicalSite): ConditionSet {
  return {
    id: `new-${site.id}`,
    siteId: site.id,
    code: `COND-${site.code}`,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    density: 0,
    balanceThreshold: 0,
    offBalanceThreshold: 0,
    azimuthCorrection: 0,
    geometryTolerance: 0,
    limits: buildConditionLimits(''),
    status: 'draft',
    version: 1,
  }
}

function getConditionStatusPriority(status: ConditionSet['status']) {
  return status === 'draft' ? 3 : status === 'approved' ? 2 : status === 'published' ? 1 : 0
}

function makeConditionPatch(condition: ConditionSet): Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'> {
  return {
    effectiveFrom: condition.effectiveFrom,
    density: condition.density,
    balanceThreshold: condition.balanceThreshold,
    offBalanceThreshold: condition.offBalanceThreshold,
    azimuthCorrection: condition.azimuthCorrection,
    geometryTolerance: condition.geometryTolerance,
    limits: condition.limits?.map((item) => ({ ...item })) ?? [],
  }
}

function ConditionLimitsDialog({
  input,
  canEdit,
  onClose,
  onCreate,
  onSave,
  onCreateVersion,
  onApprove,
  onPublish,
  pending,
}: {
  input: {
    site: GeologicalSite
    condition: ConditionSet
    isCreate: boolean
  }
  canEdit: boolean
  onClose: () => void
  onCreate: (next: Omit<ConditionSet, 'id' | 'status' | 'version'>) => void
  onSave: (patch: { current: ConditionSet; next: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'> }) => void
  onCreateVersion: (source: ConditionSet) => void
  onApprove: (source: ConditionSet) => void
  onPublish: (source: ConditionSet) => void
  pending: boolean
}) {
  const [condition, setCondition] = useState<ConditionSet>(input.condition)
  const limits = condition.limits ?? []
  const siteName = input.site.name
  const canMutate = canEdit && (condition.status === 'draft' || input.isCreate)
  const canApprove = canEdit && condition.status === 'draft'
  const canPublish = canEdit && condition.status === 'approved'
  const canCreateVersion = canEdit && condition.status !== 'draft' && !input.isCreate
  const canSubmitSave = canEdit && canMutate && limits.length > 0

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog geobase-dialog--limits" role="dialog" aria-modal="true" aria-labelledby="condition-limits-title">
      <header><div><span><SlidersHorizontal size={20} /></span><div><h2 id="condition-limits-title">Кондиционные лимиты</h2><p>{siteName} · {condition.code} · действует с {new Date(`${condition.effectiveFrom}T00:00:00`).toLocaleDateString('ru-RU')} · версия {condition.version}</p></div></div><button type="button" onClick={onClose} aria-label="Закрыть список кондиционных лимитов"><X size={19} /></button></header>
      <div className="geobase-dialog__body">
        <div className="geobase-limits-table">
          <div className="geobase-limits-table__head"><span>Параметр</span><span>Значение</span><span>Ед. изм.</span></div>
          {limits.map((limit, index) => <div key={`${limit.id}-${index}`} className="geobase-limits-table__row">
            <span>{limit.parameter}</span>
            <span><input type="text" value={limit.value} disabled={!canMutate || pending} onChange={(event) => setCondition({
              ...condition,
              limits: condition.limits?.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item),
            })} /></span>
            <small>{limit.unit ?? '—'}</small>
          </div>)}
        </div>
      </div>
      <footer>
        <Badge tone={condition.status === 'published' ? 'success' : condition.status === 'approved' ? 'info' : 'warning'} dot>
          {condition.status === 'published' ? 'Опубликованная версия' : condition.status === 'approved' ? 'Утверждённая версия' : condition.status === 'draft' ? 'Ожидает утверждения' : 'Черновик (новый)'}
        </Badge>
        <div className="geobase-limits-table__actions">
          {!canEdit && <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Нет прав для редактирования набора кондиций.</span>}
          {input.isCreate && <Button size="sm" disabled={!canSubmitSave || pending} onClick={() => onCreate(makeConditionPatch(condition) as Omit<ConditionSet, 'id' | 'status' | 'version'>)}><Plus size={15} /> Создать набор</Button>}
          {canMutate && <Button size="sm" disabled={!canSubmitSave || pending} onClick={() => onSave({ current: input.condition, next: makeConditionPatch(condition) })}><CheckCircle2 size={14} /> Сохранить</Button>}
          {canApprove && <Button size="sm" className="geobase-condition-limits__approve-button" disabled={pending} onClick={() => onApprove(condition)}><BadgeCheck size={15} /> Утвердить версию</Button>}
          {canCreateVersion && <Button size="sm" disabled={pending} onClick={() => onCreateVersion(condition)}>Новая версия</Button>}
          {canPublish && <Button size="sm" disabled={pending} onClick={() => onPublish(condition)}>Опубликовать</Button>}
        </div>
        <Button disabled={pending} variant="secondary" onClick={onClose}>Закрыть</Button>
      </footer>
    </section>
  </div>
}

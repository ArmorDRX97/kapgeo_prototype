import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Database,
  Layers3,
  MapPinned,
  Mountain,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getDepositDescription,
  getDepositName,
  type CreateDepositInput,
  type Deposit,
  type DepositObjectType,
  type UpdateDepositPatch,
} from '../../entities/geology-master/model/types'
import {
  fetchGeologicalMasterData,
  fetchPlatformPreferences,
  savePlatformPreferences,
} from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import './geobase.css'

const objectTypeLabels: Record<DepositObjectType, string> = {
  field: 'Месторождение',
  area: 'Площадь',
  custom: 'Другой тип',
}

type DepositFormState = {
  code: string
  objectType: DepositObjectType
  customType: string
  nameRu: string
  nameKk: string
  nameEn: string
  descriptionRu: string
  descriptionKk: string
  descriptionEn: string
  coordinateSystem: string
  isHidden: boolean
}

export type DepositDependencies = {
  sites: number
  lenses: number
  conditions: number
  occurrences: number
}

function formFromDeposit(deposit: Deposit): DepositFormState {
  return {
    code: String(deposit.code),
    objectType: deposit.objectType,
    customType: deposit.customType ?? '',
    nameRu: deposit.nameRu,
    nameKk: deposit.nameKk,
    nameEn: deposit.nameEn,
    descriptionRu: deposit.descriptionRu,
    descriptionKk: deposit.descriptionKk,
    descriptionEn: deposit.descriptionEn,
    coordinateSystem: deposit.coordinateSystem,
    isHidden: deposit.isHidden,
  }
}

function createForm(nextCode: number): DepositFormState {
  return {
    code: String(nextCode),
    objectType: 'field',
    customType: '',
    nameRu: '',
    nameKk: '',
    nameEn: '',
    descriptionRu: '',
    descriptionKk: '',
    descriptionEn: '',
    coordinateSystem: '',
    isHidden: false,
  }
}

function formValid(form: DepositFormState) {
  return Number.isInteger(Number(form.code))
    && Number(form.code) > 0
    && Boolean(form.nameRu.trim())
    && Boolean(form.nameKk.trim())
    && Boolean(form.nameEn.trim())
    && (form.objectType !== 'custom' || Boolean(form.customType.trim()))
}

function toCreateInput(form: DepositFormState): CreateDepositInput {
  return {
    code: Number(form.code),
    objectType: form.objectType,
    customType: form.customType || undefined,
    nameRu: form.nameRu,
    nameKk: form.nameKk,
    nameEn: form.nameEn,
    descriptionRu: form.descriptionRu,
    descriptionKk: form.descriptionKk,
    descriptionEn: form.descriptionEn,
    coordinateSystem: form.coordinateSystem,
    isHidden: form.isHidden,
  }
}

function toUpdatePatch(form: DepositFormState): UpdateDepositPatch {
  return {
    objectType: form.objectType,
    customType: form.customType || undefined,
    nameRu: form.nameRu,
    nameKk: form.nameKk,
    nameEn: form.nameEn,
    descriptionRu: form.descriptionRu,
    descriptionKk: form.descriptionKk,
    descriptionEn: form.descriptionEn,
    coordinateSystem: form.coordinateSystem,
    isHidden: form.isHidden,
  }
}

export function GeologyDatabaseRegistry({ onOpenDeposit }: {
  onOpenDeposit: (depositId: string) => void
}) {
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const currentDepositMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const preferences = preferencesQuery.data
      if (!preferences) throw new Error('Не удалось загрузить пользовательские настройки.')
      return savePlatformPreferences({
        locale: preferences.locale,
        density: preferences.density,
        contrast: preferences.contrast,
        reducedMotion: preferences.reducedMotion,
        currentDepositId: depositId,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-preferences'] })
    },
  })
  const data = masterQuery.data
  const currentDepositId = preferencesQuery.data?.currentDepositId
  const orderedDeposits = useMemo(() => [...(data?.deposits ?? [])].sort((left, right) => {
    if ((left.id === currentDepositId) !== (right.id === currentDepositId)) return left.id === currentDepositId ? -1 : 1
    if (left.isHidden !== right.isHidden) return left.isHidden ? 1 : -1
    return left.nameRu.localeCompare(right.nameRu, 'ru') || left.code - right.code
  }), [currentDepositId, data?.deposits])
  const currentError = masterQuery.error ?? currentDepositMutation.error

  if (masterQuery.isLoading || !data) return <div className="page-loading"><span /><p>Открываем базу геологических данных…</p></div>

  return <div className="page-stack geobase-page">
    <PageHeader
      eyebrow="Геологический модуль"
      title="База геологических данных"
      description="Месторождения — корневые объекты для участков, залежей, скважин и связанных геологических данных. Создание новых объектов выполняется в администрировании."
    />

    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}

    {orderedDeposits.length ? <section className="geobase-deposit-grid" aria-label="Месторождения">
      {orderedDeposits.map((item) => {
        const current = currentDepositId === item.id
        const sites = data.sites.filter((site) => site.depositId === item.id)
        const lensCount = new Set([
          ...item.occurrences.map((occurrence) => occurrence.nameRu.trim().toLocaleLowerCase('ru')),
        ].filter(Boolean)).size
        return <article className={`geobase-deposit-card${current ? ' is-current' : ''}${item.isHidden ? ' is-hidden' : ''}`} key={item.id}>
          <header className="geobase-deposit-card__header">
            <span className="geobase-deposit-card__icon"><Mountain size={24} /></span>
            <span className="geobase-deposit-card__identity">
              <small>{item.objectType === 'custom' ? item.customType : objectTypeLabels[item.objectType]} · № {item.code}</small>
              <strong>{getDepositName(item)}</strong>
              <span>{item.nameKk} · {item.nameEn}</span>
            </span>
            <Badge tone={item.isHidden ? 'neutral' : current ? 'info' : 'success'}>{item.isHidden ? 'Скрыто' : current ? 'Текущее' : 'Используется'}</Badge>
          </header>

          <p className="geobase-deposit-card__description">{getDepositDescription(item) || 'Краткое описание месторождения пока не заполнено.'}</p>

          <dl className="geobase-deposit-card__facts">
            <div><dt><MapPinned size={16} /> Участки</dt><dd>{sites.length}</dd></div>
            <div><dt><Layers3 size={16} /> Залежи</dt><dd>{lensCount}</dd></div>
            <div className="geobase-deposit-card__coordinate"><dt><Database size={16} /> Система координат</dt><dd>{item.coordinateSystem || 'Не указана'}</dd></div>
          </dl>

          <footer className="geobase-deposit-card__footer">
            <span><CalendarDays size={15} /> Обновлено {new Date(item.updatedAt).toLocaleDateString('ru-RU')}</span>
            <div>
              <Button size="sm" variant={current ? 'secondary' : 'quiet'} disabled={current || currentDepositMutation.isPending || item.isHidden} onClick={() => currentDepositMutation.mutate(item.id)} aria-label={`Выбрать ${item.nameRu} текущим`}><CheckCircle2 size={14} /> {current ? 'Текущее' : 'Выбрать'}</Button>
              <Button size="sm" variant="secondary" onClick={() => onOpenDeposit(item.id)} aria-label={`Открыть ${getDepositName(item)}`}>Открыть карточку <ArrowRight size={15} /></Button>
            </div>
          </footer>
        </article>
      })}
    </section> : <div className="geobase-empty geobase-empty--cards"><Database size={24} /><strong>Месторождений пока нет</strong><span>Новые месторождения создаются администратором системы.</span></div>}
  </div>
}

export function DepositEditor({ deposit, canEdit, canDelete, pending, onSave, onDelete }: {
  deposit: Deposit
  canEdit: boolean
  canDelete: boolean
  pending: boolean
  onSave: (patch: UpdateDepositPatch) => void
  onDelete: () => void
}) {
  const [form, setForm] = useState(() => formFromDeposit(deposit))
  const baseline = useMemo(() => formFromDeposit(deposit), [deposit])
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const readOnly = !canEdit || deposit.status === 'archived'

  return <div className="geobase-editor">
    <DepositForm form={form} onChange={setForm} disabled={readOnly || pending} immutable />
    <div className="geobase-editor__actions">
      {canDelete && <Button variant="danger" disabled={deposit.status === 'archived' || pending} onClick={onDelete}><Trash2 size={15} />Удалить месторождение</Button>}
      <span />
      <Button variant="secondary" disabled={readOnly || pending || !dirty} onClick={() => setForm(baseline)}>Отменить изменения</Button>
      <Button disabled={readOnly || pending || !dirty || !formValid(form)} onClick={() => onSave(toUpdatePatch(form))}><Save size={15} />Сохранить изменения</Button>
    </div>
  </div>
}

function DepositForm({ form, onChange, disabled, immutable = false }: { form: DepositFormState; onChange: (next: DepositFormState) => void; disabled: boolean; immutable?: boolean }) {
  const set = <K extends keyof DepositFormState>(key: K, value: DepositFormState[K]) => onChange({ ...form, [key]: value })
  return <div className="geobase-form">
    <div className="geobase-form__identity">
      <label className="field"><span className="field__label">Код (ID) <em>*</em></span><input disabled={disabled || immutable} type="number" min="1" step="1" value={form.code} onChange={(event) => set('code', event.target.value)} /><span className="field__hint">После создания не изменяется.</span></label>
      <label className="field"><span className="field__label">Тип объекта <em>*</em></span><select disabled={disabled} value={form.objectType} onChange={(event) => set('objectType', event.target.value as DepositObjectType)}><option value="field">Месторождение</option><option value="area">Площадь</option><option value="custom">Другой тип</option></select></label>
      <label className="field"><span className="field__label">Система координат</span><input disabled={disabled} value={form.coordinateSystem} onChange={(event) => set('coordinateSystem', event.target.value)} placeholder="Например: EPSG:32642" /></label>
      {form.objectType === 'custom' && <label className="field geobase-form__wide"><span className="field__label">Наименование пользовательского типа <em>*</em></span><input disabled={disabled} value={form.customType} onChange={(event) => set('customType', event.target.value)} /></label>}
    </div>
    {([
      { locale: 'RU', title: 'Русский', name: 'nameRu', description: 'descriptionRu' },
      { locale: 'KZ', title: 'Қазақша', name: 'nameKk', description: 'descriptionKk' },
      { locale: 'EN', title: 'English', name: 'nameEn', description: 'descriptionEn' },
    ] as const).map(({ locale, title, name, description }) => <fieldset className="geobase-form__locale" key={locale}>
      <legend>{title}</legend>
      <div><label className="field"><span className="field__label">Название ({locale}) <em>*</em></span><input disabled={disabled} value={form[name]} onChange={(event) => set(name, event.target.value)} /></label>
        <label className="field"><span className="field__label">Описание ({locale})</span><textarea disabled={disabled} rows={2} value={form[description]} onChange={(event) => set(description, event.target.value)} /></label></div>
    </fieldset>)}
    <label className="geobase-visibility"><input disabled={disabled} type="checkbox" checked={!form.isHidden} onChange={(event) => set('isHidden', !event.target.checked)} /><span><strong>Использовать месторождение</strong><small>Если выключить, объект исчезнет из обычных списков выбора, но сохранит данные и историю.</small></span></label>
  </div>
}

export function CreateDepositDialog({ nextCode, existingCodes, pending, error, onClose, onSubmit }: {
  nextCode: number
  existingCodes: number[]
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (input: CreateDepositInput) => void
}) {
  const [form, setForm] = useState(() => createForm(nextCode))
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose, pending])
  const duplicateCode = existingCodes.includes(Number(form.code))

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog" role="dialog" aria-modal="true" aria-labelledby="create-deposit-title">
      <header><div><span><Database size={20} /></span><div><h2 id="create-deposit-title">Новое месторождение</h2><p>Создайте корневой объект БГД. Код будет зафиксирован, а названия сохранятся на трёх языках.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму"><X size={19} /></button></header>
      <div className="geobase-dialog__body"><DepositForm form={form} onChange={setForm} disabled={pending} />{duplicateCode && <span className="field__error">Такой код уже используется.</span>}{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}</div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending || !formValid(form) || duplicateCode} onClick={() => onSubmit(toCreateInput(form))}><Database size={15} /> Создать месторождение</Button></footer>
    </section>
  </div>
}

export function DeleteDepositDialog({ deposit, dependencies, pending, error, onClose, onConfirm }: {
  deposit: Deposit
  dependencies: DepositDependencies
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  const dependencyTotal = dependencies.sites + dependencies.lenses + dependencies.conditions + dependencies.occurrences
  return <div className="geobase-dialog-backdrop" role="presentation">
    <section className="geobase-dialog geobase-dialog--confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-deposit-title">
      <header><div><span className="is-danger"><Trash2 size={20} /></span><div><h2 id="delete-deposit-title">Удалить «{deposit.nameRu}»?</h2><p>Удаление необратимо для записи месторождения. Сведения об операции сохранятся в аудите.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть подтверждение"><X size={19} /></button></header>
      <div className="geobase-dialog__body">
        <div className={`geobase-delete-check${dependencyTotal ? ' is-blocked' : ''}`}><CircleAlert size={18} /><span><strong>{dependencyTotal ? 'Удаление заблокировано зависимостями' : 'Связанные объекты не найдены'}</strong><small>Участки: {dependencies.sites} · Залежи: {dependencies.lenses + dependencies.occurrences} · Кондиции: {dependencies.conditions}</small></span></div>
        {dependencyTotal > 0 && <p className="field__hint">Чтобы сохранить целостность БГД, скройте месторождение либо сначала перенесите дочерние объекты.</p>}
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      </div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button variant="danger" disabled={pending || dependencyTotal > 0} onClick={onConfirm}><Trash2 size={15} /> Удалить безвозвратно</Button></footer>
    </section>
  </div>
}

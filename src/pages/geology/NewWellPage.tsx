import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Calculator, CircleAlert, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CreateWellInput, UpdateWellInput, Well, WellBgdData, WellPurpose, WellType } from '../../entities/well/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { createWell, fetchGeologicalMasterData, fetchPlatformPreferences, fetchWell, fetchWells, updateWell } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import '../../features/geobase/geobase.css'
import { createEmptyWellBgdForm, validateWellBgdForm } from '../../features/geobase/model/wellBgdForm'

const tabs = [
  { id: 'description', label: 'Описание' },
  { id: 'drilling', label: 'Проходка' },
  { id: 'development', label: 'Освоение' },
  { id: 'geology', label: 'Геология' },
] as const
type TabId = typeof tabs[number]['id']

const wellTypes: WellType[] = ['Закачная', 'Откачная', 'Универсальная', 'Контрольная', 'Наблюдательная', 'Гидрогеологическая', 'Разведочная', 'Технического водоснабжения', 'Прочая']
const statuses: Well['status'][] = ['На проверке', 'Работает', 'Отключена', 'Требует внимания']
const people = ['Ирина Иванова', 'Аскар Аскаров', 'Марина Ли', 'Садык Нурланов']

function purposeFor(type: WellType): WellPurpose {
  if (type === 'Разведочная') return 'Разведочная'
  if (type === 'Наблюдательная' || type === 'Контрольная') return 'Наблюдательная'
  return 'Эксплуатационная'
}

function formFromWell(well: Well, depositId: string): CreateWellInput {
  const fallback = createEmptyWellBgdForm(depositId).bgd!
  const name = Number(well.code.replace(/\D/g, '')) || 1
  const bgd = well.bgd ?? { ...fallback, name, depositId, profileId: well.profile === '—' ? '' : well.profile, geoBlockId: well.block === '—' ? '' : well.block, geometry: { ...fallback.geometry, headX: well.coordinates.x || null, headY: well.coordinates.y || null, acceptedDepth: well.depth || null }, drilling: { ...fallback.drilling, designDepth: well.depth || null, loggingDepth: well.depth || null }, statusHistory: [{ status: well.status, changedAt: fallback.statusChangedAt }] }
  return { code: String(bgd.name), type: well.type, status: well.status, block: well.block, cell: well.cell, purpose: well.purpose, site: well.site, profile: well.profile, coordinates: well.coordinates, crs: well.crs, depth: well.depth, casingDiameter: well.casingDiameter, depositId: bgd.depositId, lensId: bgd.lensId, siteId: '', projectCode: '', bgd: structuredClone(bgd) }
}

function numberValue(value: string): number | null {
  if (value.trim() === '') return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

export function NewWellPage() {
  const navigate = useNavigate()
  return <WellEditorPage onCancel={() => void navigate({ to: '/geology/wells' })} onSaved={(well) => void navigate({ to: '/objects/wells/$wellId', params: { wellId: well.id } })} />
}

export function WellEditorPage({ depositId, wellId, onCancel, onSaved }: { depositId?: string; wellId?: string; onCancel: () => void; onSaved: (well: Well) => void }) {
  const { persona } = useSession()
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const wellQuery = useQuery({ queryKey: ['well', wellId], queryFn: () => fetchWell(wellId!), enabled: Boolean(wellId) })
  const resolvedDepositId = depositId ?? preferencesQuery.data?.currentDepositId ?? 'DEP-SARYTAU'
  const [form, setForm] = useState<CreateWellInput>(() => createEmptyWellBgdForm(resolvedDepositId))
  const [activeTab, setActiveTab] = useState<TabId>('description')
  const [errors, setErrors] = useState<string[]>([])
  const initialized = useRef('')
  const editing = Boolean(wellId)

  useEffect(() => {
    const key = wellId ? `edit:${wellId}:${wellQuery.data?.version ?? ''}` : `new:${resolvedDepositId}`
    if (initialized.current === key || (wellId && !wellQuery.data)) return
    const next = wellQuery.data ? formFromWell(wellQuery.data, resolvedDepositId) : createEmptyWellBgdForm(resolvedDepositId)
    const deposit = masterQuery.data?.deposits.find((item) => item.id === resolvedDepositId)
    if (deposit?.coordinateSystem) next.crs = deposit.coordinateSystem
    setForm(next)
    initialized.current = key
  }, [masterQuery.data?.deposits, resolvedDepositId, wellId, wellQuery.data])

  const canCreate = hasPermission(persona, 'geology.bgd.well.create')
  const canEditAll = hasPermission(persona, 'geology.bgd.well.update-all')
  const canEditTechnology = hasPermission(persona, 'geology.bgd.well.update-technology')
  const canEditLoggingDepth = hasPermission(persona, 'geology.bgd.well.update-logging-depth')
  const canSave = editing ? canEditAll || canEditTechnology || canEditLoggingDepth : canCreate
  const pending = masterQuery.isLoading || wellsQuery.isLoading || wellQuery.isLoading
  const mutation = useMutation({
    mutationFn: async () => {
      const validationErrors = validateWellBgdForm(form, wellsQuery.data ?? [], wellId)
      if (validationErrors.length) throw new Error(validationErrors.join('\n'))
      const bgd = structuredClone(form.bgd!)
      const status = form.status ?? 'На проверке'
      if (!editing || wellQuery.data?.status !== status) bgd.statusHistory = [...(editing ? bgd.statusHistory : []), { status, changedAt: bgd.statusChangedAt }]
      const payload: CreateWellInput = { ...form, code: String(bgd.name), purpose: purposeFor(form.type), coordinates: { x: bgd.geometry.headX ?? 0, y: bgd.geometry.headY ?? 0 }, depth: bgd.geometry.acceptedDepth ?? bgd.drilling.loggingDepth ?? bgd.drilling.designDepth ?? 0, depositId: bgd.depositId, lensId: bgd.lensId || undefined, bgd }
      if (!editing) return createWell(payload)
      return updateWell({ ...payload, wellId: wellId!, expectedVersion: wellQuery.data?.version ?? 1 } satisfies UpdateWellInput)
    },
    onSuccess: async (well) => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['wells'] }), queryClient.invalidateQueries({ queryKey: ['well', well.id] }), queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] })]); onSaved(well) },
    onError: (error) => setErrors(error.message.split('\n')),
  })

  const master = masterQuery.data
  const bgd = form.bgd!
  const currentDeposit = master?.deposits.find((item) => item.id === bgd.depositId)
  const sites = master?.sites.filter((site) => site.depositId === bgd.depositId && site.status === 'active') ?? []
  const siteIds = new Set(sites.map((site) => site.id))
  const lenses = master?.lenses.filter((lens) => siteIds.has(lens.siteId) && lens.status === 'active') ?? []
  const generalDisabled = mutation.isPending || (editing ? !canEditAll : !canCreate)
  const technologyDisabled = mutation.isPending || (editing ? !(canEditAll || canEditTechnology) : !canCreate)
  const loggingDisabled = mutation.isPending || (editing ? !(canEditAll || canEditLoggingDepth) : !canCreate)
  const setBgd = <Key extends keyof WellBgdData>(key: Key, value: WellBgdData[Key]) => setForm((current) => ({ ...current, bgd: { ...current.bgd!, [key]: value } }))
  const setFormField = <Key extends keyof CreateWellInput>(key: Key, value: CreateWellInput[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const setGeometry = (key: keyof WellBgdData['geometry'], value: number | null) => setBgd('geometry', { ...bgd.geometry, [key]: value })
  const setPassport = (key: keyof WellBgdData['passport'], value: string) => setBgd('passport', { ...bgd.passport, [key]: value })
  const setDrilling = <Key extends keyof WellBgdData['drilling']>(key: Key, value: WellBgdData['drilling'][Key]) => setBgd('drilling', { ...bgd.drilling, [key]: value })
  const setDevelopment = <Key extends keyof WellBgdData['development']>(key: Key, value: WellBgdData['development'][Key]) => setBgd('development', { ...bgd.development, [key]: value })
  const setGeology = <Key extends keyof WellBgdData['geology']>(key: Key, value: WellBgdData['geology'][Key]) => setBgd('geology', { ...bgd.geology, [key]: value })
  const calculateBottom = () => {
    const { headX, headY, headZ, acceptedDepth, bottomOffsetLength, bottomOffsetAzimuth } = bgd.geometry
    if (headX === null || headY === null || bottomOffsetLength === null || bottomOffsetAzimuth === null) return setErrors(['Для расчёта укажите X/Y устья, отклонение и азимут.'])
    const angle = bottomOffsetAzimuth * Math.PI / 180
    setBgd('geometry', { ...bgd.geometry, bottomX: Number((headX + bottomOffsetLength * Math.cos(angle)).toFixed(3)), bottomY: Number((headY + bottomOffsetLength * Math.sin(angle)).toFixed(3)), bottomZ: headZ !== null && acceptedDepth !== null ? Number((headZ - Math.sqrt(Math.max(0, acceptedDepth ** 2 - bottomOffsetLength ** 2))).toFixed(3)) : bgd.geometry.bottomZ })
    setErrors([])
  }

  if (pending) return <div className="page-loading"><span /><p>{editing ? 'Открываем карточку скважины…' : 'Подготавливаем форму создания…'}</p></div>
  if (editing && wellQuery.error) return <div className="page-stack"><PageHeader eyebrow="База геологических данных" title="Скважина не найдена" description={wellQuery.error.message} actions={<Button variant="secondary" onClick={onCancel}><ArrowLeft size={16} /> Назад</Button>} /></div>

  return <div className="page-stack geobase-page bgd-well-page" data-geology-tour="bgd-well-editor">
    <PageHeader eyebrow="База геологических данных · Скважины" title={editing ? `Скважина ${form.code}` : 'Создание скважины'} description={editing ? `Карточка месторождения ${currentDeposit?.nameRu ?? '—'} · версия ${wellQuery.data?.version ?? 1}` : 'Введите общие сведения, геометрию, паспорт, проходку, освоение и геологические условия.'} meta={<Badge tone={form.status === 'Работает' ? 'success' : form.status === 'Отключена' ? 'neutral' : 'warning'} dot>{form.status}</Badge>} actions={<Button variant="secondary" onClick={onCancel}><ArrowLeft size={16} /> К месторождению</Button>} />
    {!canSave && <div className="form-alert"><ShieldCheck size={17} /><span>Карточка открыта только для чтения. Доступные поля определяются назначенными правами.</span></div>}
    {editing && !canEditAll && canSave && <div className="form-alert"><ShieldCheck size={17} /><span>{canEditTechnology ? 'Доступно изменение типа, состояния и показателей освоения. Остальные поля — только чтение.' : 'Доступно изменение глубины по каротажу. Остальные поля — только чтение.'}</span></div>}
    {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span><strong>Проверьте форму</strong>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
    <nav className="bgd-well-tabs" aria-label="Разделы карточки скважины">{tabs.map((tab) => <button type="button" key={tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>

    {activeTab === 'description' && <DescriptionTab form={form} master={master} currentDeposit={currentDeposit} lenses={lenses} disabled={generalDisabled} technologyDisabled={technologyDisabled} setFormField={setFormField} setBgd={setBgd} setGeometry={setGeometry} setPassport={setPassport} calculateBottom={calculateBottom} />}
    {activeTab === 'drilling' && <DrillingTab bgd={bgd} disabled={generalDisabled} loggingDisabled={loggingDisabled} setDrilling={setDrilling} />}
    {activeTab === 'development' && <DevelopmentTab bgd={bgd} disabled={technologyDisabled} setDevelopment={setDevelopment} />}
    {activeTab === 'geology' && <GeologyTab bgd={bgd} disabled={generalDisabled} setGeology={setGeology} />}

    <footer className="bgd-well-actions"><Button variant="secondary" onClick={onCancel}>Отмена</Button><span>{editing ? 'Изменения создадут новую версию и запись аудита.' : 'После сохранения скважина появится в карточке месторождения.'}</span><Button disabled={!canSave || mutation.isPending} onClick={() => { setErrors([]); mutation.mutate() }}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : editing ? 'Сохранить изменения' : 'Создать скважину'}</Button></footer>
    <datalist id="bgd-well-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
  </div>
}

type FormSetter = <Key extends keyof CreateWellInput>(key: Key, value: CreateWellInput[Key]) => void
type BgdSetter = <Key extends keyof WellBgdData>(key: Key, value: WellBgdData[Key]) => void

function DescriptionTab({ form, master, currentDeposit, lenses, disabled, technologyDisabled, setFormField, setBgd, setGeometry, setPassport, calculateBottom }: { form: CreateWellInput; master: Awaited<ReturnType<typeof fetchGeologicalMasterData>> | undefined; currentDeposit: Awaited<ReturnType<typeof fetchGeologicalMasterData>>['deposits'][number] | undefined; lenses: Awaited<ReturnType<typeof fetchGeologicalMasterData>>['lenses']; disabled: boolean; technologyDisabled: boolean; setFormField: FormSetter; setBgd: BgdSetter; setGeometry: (key: keyof WellBgdData['geometry'], value: number | null) => void; setPassport: (key: keyof WellBgdData['passport'], value: string) => void; calculateBottom: () => void }) {
  const bgd = form.bgd!
  return <div className="bgd-well-stack">
    <Panel title="Общие сведения" description="Название скважины уникально в пределах выбранного месторождения."><div className="form-grid bgd-well-form-grid">
      <NumericField label="Название скважины" required value={bgd.name} disabled={disabled} onChange={(value) => { setBgd('name', value ?? 0); setFormField('code', String(value ?? '')) }} />
      <label className="field"><span className="field__label">Месторождение <em>*</em></span><select disabled={disabled} value={bgd.depositId} onChange={(event) => { const next = master?.deposits.find((item) => item.id === event.target.value); setBgd('depositId', event.target.value); setFormField('depositId', event.target.value); if (next?.coordinateSystem) setFormField('crs', next.coordinateSystem) }}><option value="">Выберите</option>{master?.deposits.filter((item) => !item.isHidden && item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.nameRu}</option>)}</select></label>
      <label className="field"><span className="field__label">Залежь</span><select disabled={disabled} value={bgd.lensId} onChange={(event) => setBgd('lensId', event.target.value)}><option value="">Не выбрана</option>{currentDeposit?.occurrences.map((item) => <option key={item.id} value={item.id}>{item.nameRu}</option>)}{lenses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <SelectField label="Профиль" value={bgd.profileId} disabled={disabled} options={['PR-07', 'PR-06', 'CN-02']} onChange={(value) => { setBgd('profileId', value); setFormField('profile', value || 'Не назначен') }} />
      <label className="field"><span className="field__label">Тип скважины <em>*</em></span><select disabled={technologyDisabled} value={form.type} onChange={(event) => setFormField('type', event.target.value as WellType)}>{wellTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
      <SelectField label="Геологический блок" value={bgd.geoBlockId} disabled={disabled} options={['BLK-07-11', 'BLK-07-12', 'BLK-07-13']} onChange={(value) => { setBgd('geoBlockId', value); setFormField('block', value || '—') }} />
      <SelectField label="Технологический блок" value={bgd.techBlockId} disabled={disabled} options={['TC-07-12', 'TC-07-13']} onChange={(value) => setBgd('techBlockId', value)} />
      <label className="field"><span className="field__label">Состояние <em>*</em></span><select disabled={technologyDisabled} value={form.status} onChange={(event) => { setFormField('status', event.target.value as Well['status']); setBgd('statusChangedAt', new Date().toISOString().slice(0, 16)) }}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span className="field__label">Дата изменения состояния <em>*</em></span><input type="datetime-local" disabled value={bgd.statusChangedAt} /></label>
    </div><div className="bgd-well-language-grid"><TextArea label="Описание на русском языке" value={bgd.descriptionRu} disabled={disabled} onChange={(value) => setBgd('descriptionRu', value)} /><TextArea label="Описание на казахском языке" value={bgd.descriptionKk} disabled={disabled} onChange={(value) => setBgd('descriptionKk', value)} /><TextArea label="Описание на английском языке" value={bgd.descriptionEn} disabled={disabled} onChange={(value) => setBgd('descriptionEn', value)} /></div><TextArea label="Примечание" value={bgd.note} disabled={disabled} onChange={(value) => setBgd('note', value)} /></Panel>
    <Panel title="Геометрия" description="Координаты устья заполняются парой. Координаты забоя можно ввести или рассчитать."><div className="bgd-well-coordinate-grid"><CoordinateGroup title="Устье" values={[['X', bgd.geometry.headX, 'headX'], ['Y', bgd.geometry.headY, 'headY'], ['Z', bgd.geometry.headZ, 'headZ']]} disabled={disabled} onChange={setGeometry} /><CoordinateGroup title="Забой" values={[['X', bgd.geometry.bottomX, 'bottomX'], ['Y', bgd.geometry.bottomY, 'bottomY'], ['Z', bgd.geometry.bottomZ, 'bottomZ']]} disabled={disabled} onChange={setGeometry} /></div><div className="form-grid bgd-well-form-grid"><NumericField label="Глубина, принятая к актированию, м" value={bgd.geometry.acceptedDepth} disabled={disabled} onChange={(value) => setGeometry('acceptedDepth', value)} /><NumericField label="Отклонение забоя в плане, м" value={bgd.geometry.bottomOffsetLength} disabled={disabled} onChange={(value) => setGeometry('bottomOffsetLength', value)} /><NumericField label="Азимут отклонения, °" value={bgd.geometry.bottomOffsetAzimuth} disabled={disabled} onChange={(value) => setGeometry('bottomOffsetAzimuth', value)} /><label className="field"><span className="field__label">Система координат</span><input disabled value={form.crs} /></label></div><div className="bgd-well-inline-actions"><Button variant="secondary" disabled={disabled} onClick={calculateBottom}><Calculator size={16} /> Рассчитать координаты забоя</Button></div></Panel>
    <Panel title="Паспорт" description="Паспортные сведения и ответственные специалисты."><div className="form-grid bgd-well-form-grid"><label className="field"><span className="field__label">Дата составления паспорта</span><input type="datetime-local" disabled={disabled} max={new Date().toISOString().slice(0, 16)} value={bgd.passport.date} onChange={(event) => setPassport('date', event.target.value)} /></label>{([['author', 'Паспорт составил'], ['chiefGeologist', 'Главный геолог'], ['chiefGeophysicist', 'Главный геофизик'], ['drillingManager', 'Начальник бурения'], ['samplingPerformer', 'Опробование выполнил'], ['interpretationPerformer', 'Интерпретацию выполнил'], ['surveyor', 'Топограф']] as const).map(([key, label]) => <PersonField key={key} label={label} value={bgd.passport[key]} disabled={disabled} onChange={(value) => setPassport(key, value)} />)}</div></Panel>
  </div>
}

function DrillingTab({ bgd, disabled, loggingDisabled, setDrilling }: { bgd: WellBgdData; disabled: boolean; loggingDisabled: boolean; setDrilling: <Key extends keyof WellBgdData['drilling']>(key: Key, value: WellBgdData['drilling'][Key]) => void }) {
  return <div className="bgd-well-stack"><Panel title="Проходка" description="Общие сведения бурения и контрольные глубины."><div className="form-grid bgd-well-form-grid"><DateField label="Дата начала проходки" value={bgd.drilling.startedAt} disabled={disabled} onChange={(value) => setDrilling('startedAt', value)} /><DateField label="Дата окончания проходки" value={bgd.drilling.completedAt} disabled={disabled} onChange={(value) => setDrilling('completedAt', value)} /><SelectField label="Вид бурения" value={bgd.drilling.drillingType} disabled={disabled} options={['Колонковое', 'Роторное', 'Шнековое']} onChange={(value) => setDrilling('drillingType', value)} /><PersonField label="Буровой мастер" value={bgd.drilling.foreman} disabled={disabled} onChange={(value) => setDrilling('foreman', value)} /><SelectField label="Тип бурильного станка" value={bgd.drilling.rigType} disabled={disabled} options={['ЗИФ-1200', 'УРБ-2А2', 'LF-90']} onChange={(value) => setDrilling('rigType', value)} /><NumericField label="Номер бурового агрегата" value={bgd.drilling.rigNumber} disabled={disabled} onChange={(value) => setDrilling('rigNumber', value)} /><SelectField label="Буровая компания" value={bgd.drilling.company} disabled={disabled} options={['АО «Волковгеология»', 'ТОО «KAZ Drilling»']} onChange={(value) => setDrilling('company', value)} /><SelectField label="Бригада" value={bgd.drilling.brigade} disabled={disabled} options={['Бригада 1', 'Бригада 2', 'Бригада 3']} onChange={(value) => setDrilling('brigade', value)} /><NumericField label="Глубина по проекту, м" value={bgd.drilling.designDepth} disabled={disabled} onChange={(value) => setDrilling('designDepth', value)} /><NumericField label="Глубина по журналу бурения, м" value={bgd.drilling.drillLogDepth} disabled={disabled} onChange={(value) => setDrilling('drillLogDepth', value)} /><NumericField label="Глубина по каротажу, м" value={bgd.drilling.loggingDepth} disabled={loggingDisabled} onChange={(value) => setDrilling('loggingDepth', value)} /></div></Panel><Panel title="Интервалы бурения" description="Диаметр и границы интервала обязательны для каждой добавленной строки." action={<Button size="sm" variant="secondary" disabled={disabled} onClick={() => setDrilling('intervals', [...bgd.drilling.intervals, { id: `DRILL-${Date.now()}`, drillingDiameter: null, depthFrom: null, depthTo: null, drillingTool: '', flushingAgent: '' }])}><Plus size={15} /> Добавить интервал</Button>}><div className="bgd-well-repeat-list">{bgd.drilling.intervals.map((item, index) => <article key={item.id}><header><strong>Интервал {index + 1}</strong><DeleteButton disabled={disabled} label={`Удалить интервал ${index + 1}`} onClick={() => setDrilling('intervals', bgd.drilling.intervals.filter((row) => row.id !== item.id))} /></header><div className="form-grid bgd-well-form-grid"><NumericField label="Диаметр, мм" required value={item.drillingDiameter} disabled={disabled} onChange={(value) => setDrilling('intervals', bgd.drilling.intervals.map((row) => row.id === item.id ? { ...row, drillingDiameter: value } : row))} /><NumericField label="От, м" required value={item.depthFrom} disabled={disabled} onChange={(value) => setDrilling('intervals', bgd.drilling.intervals.map((row) => row.id === item.id ? { ...row, depthFrom: value } : row))} /><NumericField label="До, м" required value={item.depthTo} disabled={disabled} onChange={(value) => setDrilling('intervals', bgd.drilling.intervals.map((row) => row.id === item.id ? { ...row, depthTo: value } : row))} /><SelectField label="Породоразрушающий инструмент" value={item.drillingTool} disabled={disabled} options={['Трёхшарошечное долото', 'Алмазная коронка', 'PDC-долото']} onChange={(value) => setDrilling('intervals', bgd.drilling.intervals.map((row) => row.id === item.id ? { ...row, drillingTool: value } : row))} /><SelectField label="Очистной агент" value={item.flushingAgent} disabled={disabled} options={['Полимерно-глинистый', 'Сульфанол', 'Техническая вода']} onChange={(value) => setDrilling('intervals', bgd.drilling.intervals.map((row) => row.id === item.id ? { ...row, flushingAgent: value } : row))} /></div></article>)}{!bgd.drilling.intervals.length && <EmptyRows text="Интервалы бурения ещё не добавлены." />}</div></Panel></div>
}

function DevelopmentTab({ bgd, disabled, setDevelopment }: { bgd: WellBgdData; disabled: boolean; setDevelopment: <Key extends keyof WellBgdData['development']>(key: Key, value: WellBgdData['development'][Key]) => void }) {
  return <div className="bgd-well-stack"><Panel title="Освоение" description="Показатели скважины после завершения освоения."><div className="form-grid bgd-well-form-grid"><NumericField label="Дебит после освоения, м³/ч" value={bgd.development.flowRate} disabled={disabled} onChange={(value) => setDevelopment('flowRate', value)} /><NumericField label="Удельный дебит, м³/ч" value={bgd.development.specificFlowRate} disabled={disabled} onChange={(value) => setDevelopment('specificFlowRate', value)} /></div></Panel><Panel title="Работы, проведённые при освоении" description="Каждая работа хранит даты, метод и описания на трёх языках." action={<Button size="sm" variant="secondary" disabled={disabled} onClick={() => setDevelopment('works', [...bgd.development.works, { id: `WORK-${Date.now()}`, workType: '', startedAt: '', completedAt: '', method: '', descriptionRu: '', descriptionKk: '', descriptionEn: '' }])}><Plus size={15} /> Добавить работу</Button>}><div className="bgd-well-repeat-list">{bgd.development.works.map((item, index) => <article key={item.id}><header><strong>Работа {index + 1}</strong><DeleteButton disabled={disabled} label={`Удалить работу ${index + 1}`} onClick={() => setDevelopment('works', bgd.development.works.filter((row) => row.id !== item.id))} /></header><div className="form-grid bgd-well-form-grid"><SelectField label="Вид работ" required value={item.workType} disabled={disabled} options={['Эрлифтная прокачка', 'Пневмоимпульсная обработка', 'Химреагентная обработка']} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, workType: value } : row))} /><DateField label="Дата начала" value={item.startedAt} disabled={disabled} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, startedAt: value } : row))} /><DateField label="Дата окончания" value={item.completedAt} disabled={disabled} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, completedAt: value } : row))} /><SelectField label="Способ освоения" value={item.method} disabled={disabled} options={['Прокачка', 'Эрлифт', 'Комбинированный']} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, method: value } : row))} /></div><div className="bgd-well-language-grid"><TextArea label="Описание на русском" value={item.descriptionRu} disabled={disabled} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, descriptionRu: value } : row))} /><TextArea label="Описание на казахском" value={item.descriptionKk} disabled={disabled} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, descriptionKk: value } : row))} /><TextArea label="Описание на английском" value={item.descriptionEn} disabled={disabled} onChange={(value) => setDevelopment('works', bgd.development.works.map((row) => row.id === item.id ? { ...row, descriptionEn: value } : row))} /></div></article>)}{!bgd.development.works.length && <EmptyRows text="Работы по освоению ещё не добавлены." />}</div></Panel></div>
}

function GeologyTab({ bgd, disabled, setGeology }: { bgd: WellBgdData; disabled: boolean; setGeology: <Key extends keyof WellBgdData['geology']>(key: Key, value: WellBgdData['geology'][Key]) => void }) {
  return <div className="bgd-well-stack"><Panel title="Геологические условия" description="Условия сооружения скважины и уровни по результатам наблюдений."><div className="form-grid bgd-well-form-grid"><NumericField label="Глубина границы вечной мерзлоты, м" value={bgd.geology.permafrostDepth} disabled={disabled} onChange={(value) => setGeology('permafrostDepth', value)} /><NumericField label="Статический уровень грунтовых вод, м" value={bgd.geology.groundwaterLevel} disabled={disabled} onChange={(value) => setGeology('groundwaterLevel', value)} /></div><TextArea label="Геологические осложнения" value={bgd.geology.complications} disabled={disabled} onChange={(value) => setGeology('complications', value)} /></Panel><Panel title="Непроницаемые интервалы по расходометрии" description="Границы каждого добавленного интервала обязательны." action={<Button size="sm" variant="secondary" disabled={disabled} onClick={() => setGeology('impermeableIntervals', [...bgd.geology.impermeableIntervals, { id: `IMP-${Date.now()}`, depthFrom: null, depthTo: null }])}><Plus size={15} /> Добавить интервал</Button>}><div className="bgd-well-repeat-list">{bgd.geology.impermeableIntervals.map((item, index) => <article key={item.id}><header><strong>Интервал {index + 1}</strong><DeleteButton disabled={disabled} label={`Удалить интервал ${index + 1}`} onClick={() => setGeology('impermeableIntervals', bgd.geology.impermeableIntervals.filter((row) => row.id !== item.id))} /></header><div className="form-grid bgd-well-form-grid"><NumericField label="От, м" required value={item.depthFrom} disabled={disabled} onChange={(value) => setGeology('impermeableIntervals', bgd.geology.impermeableIntervals.map((row) => row.id === item.id ? { ...row, depthFrom: value } : row))} /><NumericField label="До, м" required value={item.depthTo} disabled={disabled} onChange={(value) => setGeology('impermeableIntervals', bgd.geology.impermeableIntervals.map((row) => row.id === item.id ? { ...row, depthTo: value } : row))} /></div></article>)}{!bgd.geology.impermeableIntervals.length && <EmptyRows text="Непроницаемые интервалы ещё не добавлены." />}</div></Panel></div>
}

function NumericField({ label, value, required, disabled, onChange }: { label: string; value: number | null; required?: boolean; disabled: boolean; onChange: (value: number | null) => void }) { return <label className="field"><span className="field__label">{label}{required && <em> *</em>}</span><input type="number" step="any" disabled={disabled} value={value ?? ''} onChange={(event) => onChange(numberValue(event.target.value))} /></label> }
function TextArea({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label className="field"><span className="field__label">{label}</span><textarea rows={3} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></label> }
function DateField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label className="field"><span className="field__label">{label}</span><input type="datetime-local" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></label> }
function PersonField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label className="field"><span className="field__label">{label}</span><input list="bgd-well-people" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Выберите сотрудника" /></label> }
function SelectField({ label, value, options, required, disabled, onChange }: { label: string; value: string; options: string[]; required?: boolean; disabled: boolean; onChange: (value: string) => void }) { return <label className="field"><span className="field__label">{label}{required && <em> *</em>}</span><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Не выбрано</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }
function CoordinateGroup({ title, values, disabled, onChange }: { title: string; values: Array<[string, number | null, keyof WellBgdData['geometry']]>; disabled: boolean; onChange: (key: keyof WellBgdData['geometry'], value: number | null) => void }) { return <section><h3>{title}</h3><div>{values.map(([label, value, key]) => <NumericField key={key} label={label} value={value} disabled={disabled} onChange={(next) => onChange(key, next)} />)}</div></section> }
function DeleteButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) { return <button type="button" disabled={disabled} aria-label={label} onClick={onClick}><Trash2 size={16} /></button> }
function EmptyRows({ text }: { text: string }) { return <div className="bgd-well-empty"><Plus size={17} /><span>{text}</span></div> }

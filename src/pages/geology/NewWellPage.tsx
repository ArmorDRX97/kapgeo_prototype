import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, CircleAlert, MapPin, RadioTower, Ruler, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CreateWellInput, WellPurpose, WellType } from '../../entities/well/model/types'
import { createWell, fetchWells } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'

const steps = ['Идентификация', 'Координаты', 'Конструкция', 'Проверка']
const initialForm: CreateWellInput = {
  code: 'WELL-1064', type: 'Откачная', purpose: 'Эксплуатационная', site: 'Северный', profile: 'PR-07',
  coordinates: { x: 468740.2, y: 4812970.4 }, crs: 'EPSG:32642', depth: 610, casingDiameter: 168,
}

export function NewWellPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [stepError, setStepError] = useState('')
  const { data: wells = [] } = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: createWell,
    onSuccess: async (well) => {
      await queryClient.invalidateQueries({ queryKey: ['wells'] })
      await queryClient.setQueryData(['well', well.id], well)
      void navigate({ to: '/objects/wells/$wellId', params: { wellId: well.id } })
    },
  })

  const validationError = useMemo(() => {
    if (step === 0) {
      if (!/^WELL-\d{4}$/.test(form.code)) return 'Код должен соответствовать формату WELL-0000.'
      if (wells.some((well) => well.code.toLowerCase() === form.code.toLowerCase())) return 'Такой код уже существует в текущей области.'
      if (!form.site || !form.profile) return 'Укажите участок и профиль.'
    }
    if (step === 1 && (!Number.isFinite(form.coordinates.x) || !Number.isFinite(form.coordinates.y) || !form.crs)) return 'Проверьте координаты и систему координат.'
    if (step === 2 && (form.depth <= 0 || form.depth > 2000 || form.casingDiameter <= 0)) return 'Глубина должна быть от 0 до 2 000 м, диаметр — больше нуля.'
    return ''
  }, [form, step, wells])

  const next = () => {
    if (validationError) return setStepError(validationError)
    setStepError('')
    setStep((value) => Math.min(value + 1, steps.length - 1))
  }
  const setField = <Key extends keyof CreateWellInput>(key: Key, value: CreateWellInput[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const setCoordinate = (key: 'x' | 'y', value: number) => setForm((current) => ({ ...current, coordinates: { ...current.coordinates, [key]: value } }))

  return (
    <div className="page-stack wizard-page">
      <Link to="/geology/wells" className="back-link"><ArrowLeft size={16} /> К реестру скважин</Link>
      <header className="wizard-header"><div><p className="eyebrow">Геология · GEO-05</p><h1>Новая скважина</h1><p>Создание draft-версии с проверкой идентификатора, координат и конструкции.</p></div><Badge tone="warning">Черновик</Badge></header>

      <ol className="wizard-steps">
        {steps.map((label, index) => <li key={label} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}><span>{index < step ? <Check size={14} /> : index + 1}</span><strong>{label}</strong></li>)}
      </ol>

      <Panel className="wizard-card">
        {step === 0 && <IdentityStep form={form} setField={setField} />}
        {step === 1 && <CoordinatesStep form={form} setField={setField} setCoordinate={setCoordinate} />}
        {step === 2 && <ConstructionStep form={form} setField={setField} />}
        {step === 3 && <ReviewStep form={form} />}

        {(stepError || mutation.error) && <div className="form-alert form-alert--error"><CircleAlert size={17} /><span>{stepError || mutation.error?.message}</span></div>}
        <div className="wizard-actions">
          <Button variant="secondary" disabled={step === 0 || mutation.isPending} onClick={() => { setStepError(''); setStep((value) => value - 1) }}><ArrowLeft size={16} /> Назад</Button>
          <span>Шаг {step + 1} из {steps.length}</span>
          {step < steps.length - 1
            ? <Button onClick={next}>Продолжить <ArrowRight size={16} /></Button>
            : <Button disabled={mutation.isPending} onClick={() => mutation.mutate(form)}><Save size={16} /> {mutation.isPending ? 'Создаём…' : 'Создать черновик'}</Button>}
        </div>
      </Panel>
    </div>
  )
}

function IdentityStep({ form, setField }: { form: CreateWellInput; setField: <Key extends keyof CreateWellInput>(key: Key, value: CreateWellInput[Key]) => void }) {
  return <div className="wizard-section"><div className="wizard-section__intro"><RadioTower size={22} /><div><h2>Идентификация</h2><p>Код уникален в пределах предприятия и после публикации меняется через новую версию.</p></div></div><div className="form-grid"><label className="field"><span className="field__label">Код скважины <em>*</em></span><input value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} /><span className="field__hint">Формат WELL-0000</span></label><label className="field"><span className="field__label">Тип <em>*</em></span><select value={form.type} onChange={(event) => setField('type', event.target.value as WellType)}><option>Откачная</option><option>Закачная</option><option>Наблюдательная</option><option>Разведочная</option></select></label><label className="field"><span className="field__label">Назначение</span><select value={form.purpose} onChange={(event) => setField('purpose', event.target.value as WellPurpose)}><option>Эксплуатационная</option><option>Разведочная</option><option>Наблюдательная</option></select></label><label className="field"><span className="field__label">Участок</span><select value={form.site} onChange={(event) => setField('site', event.target.value)}><option>Северный</option><option>Центральный</option></select></label><label className="field"><span className="field__label">Профиль</span><input value={form.profile} onChange={(event) => setField('profile', event.target.value.toUpperCase())} /></label></div></div>
}

function CoordinatesStep({ form, setField, setCoordinate }: { form: CreateWellInput; setField: <Key extends keyof CreateWellInput>(key: Key, value: CreateWellInput[Key]) => void; setCoordinate: (key: 'x' | 'y', value: number) => void }) {
  return <div className="wizard-section"><div className="wizard-section__intro"><MapPin size={22} /><div><h2>Координаты устья</h2><p>Выполняется пространственная проверка дублей и положения в лицензионном контуре.</p></div></div><div className="form-grid"><label className="field"><span className="field__label">X / Easting <em>*</em></span><input type="number" value={form.coordinates.x} onChange={(event) => setCoordinate('x', Number(event.target.value))} /></label><label className="field"><span className="field__label">Y / Northing <em>*</em></span><input type="number" value={form.coordinates.y} onChange={(event) => setCoordinate('y', Number(event.target.value))} /></label><label className="field"><span className="field__label">Система координат</span><select value={form.crs} onChange={(event) => setField('crs', event.target.value)}><option>EPSG:32642</option><option>Локальная Сарытау</option></select></label></div><div className="coordinate-preview"><MapPin size={19} /><div><strong>Точка находится в контуре участка Северный</strong><span>Ближайшая скважина WELL-1060 · 148 м</span></div><Badge tone="success">Проверено</Badge></div></div>
}

function ConstructionStep({ form, setField }: { form: CreateWellInput; setField: <Key extends keyof CreateWellInput>(key: Key, value: CreateWellInput[Key]) => void }) {
  return <div className="wizard-section"><div className="wizard-section__intro"><Ruler size={22} /><div><h2>Проектная конструкция</h2><p>Минимальные данные для draft. Подробная колонна и интервалы заполняются в паспорте.</p></div></div><div className="form-grid"><label className="field"><span className="field__label">Проектная глубина, м <em>*</em></span><input type="number" value={form.depth} onChange={(event) => setField('depth', Number(event.target.value))} /></label><label className="field"><span className="field__label">Диаметр обсадной колонны, мм</span><input type="number" value={form.casingDiameter} onChange={(event) => setField('casingDiameter', Number(event.target.value))} /></label></div><div className="construction-preview"><span>0 м</span><i><b style={{ height: '76%' }} /></i><div><strong>Ø {form.casingDiameter} мм</strong><small>Проектная глубина {form.depth} м</small></div><span>{form.depth} м</span></div></div>
}

function ReviewStep({ form }: { form: CreateWellInput }) {
  return <div className="wizard-section"><div className="wizard-section__intro"><Check size={22} /><div><h2>Проверка перед созданием</h2><p>Будет создана версия 1 в статусе «На проверке».</p></div></div><dl className="review-grid"><div><dt>Объект</dt><dd>{form.code}</dd><small>{form.type} · {form.purpose}</small></div><div><dt>Контекст</dt><dd>{form.site} · {form.profile}</dd><small>Блок назначается позднее</small></div><div><dt>Координаты</dt><dd>{form.coordinates.x} / {form.coordinates.y}</dd><small>{form.crs}</small></div><div><dt>Конструкция</dt><dd>{form.depth} м · Ø {form.casingDiameter} мм</dd><small>Минимальный draft</small></div></dl><div className="form-alert"><CircleAlert size={17} /><span>После создания откроется единая карточка. Для публикации потребуются паспорт, контроль качества и согласование.</span></div></div>
}

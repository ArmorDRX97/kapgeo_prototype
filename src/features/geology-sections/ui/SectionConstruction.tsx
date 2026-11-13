import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, ChevronsDown, Plus, Save, Trash2, Undo2 } from 'lucide-react'
import type { GeologySection, SectionLayer, XY } from '../../../entities/geology-section/model/types'
import { createSection } from '../../../entities/geology-section/model/fixtures'
import { distance, profileLength } from '../../../entities/geology-section/lib/profile'
import { Button } from '../../../shared/ui/Button'
import { DiscardChangesDialog } from '../../../shared/ui/DiscardChangesDialog'
import { geoBlocks, techBlocks } from '../model/blockOptions'
import { plotHeaders } from '../model/plotHeaders'
import { constructSection, wellsAlongSection } from '../model/sectionConstruction'
import { fromFieldPoint, planNumber, profileVertexName, sectionPlan } from '../model/sectionPlan'
import { usePlotSize } from '../model/usePlotSize'
import { sectionWellCatalogue } from '../model/wellAssignment'
import { SectionSvg } from './SectionCanvas'
import { SectionConstructionMap } from './SectionConstructionMap'
import { SectionToolButton } from './SectionToolButton'
import './section-construction.css'

const steps = ['Трасса', 'Скважины', 'Предпросмотр'] as const
const previewLayers: SectionLayer[] = []

function SectionConstructionPreview({ section, length }: { section: GeologySection; length: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const size = usePlotSize(ref)
  const width = Math.max(size.width, 530, Math.min(3200, section.wellIds.length * 75))
  const headers = useMemo(() => plotHeaders(section, width, 0, length), [section, width, length])
  const height = Math.max(size.height, headers.top + 280)
  return <div ref={ref} className="section-construction__preview" role="region" aria-label="Предпросмотр разреза" tabIndex={0}>
    <div style={{ width, height }}><SectionSvg section={section} layers={previewLayers} headerLayout={headers} showGraphics={false} clean width={width} height={height} /></div>
  </div>
}

export function SectionConstruction({ onCancel, onSave }: {
  onCancel: () => void
  onSave: (draft: GeologySection) => void
}) {
  const [template] = useState(() => createSection(`GTR-NEW-${crypto.randomUUID().slice(0, 8)}`, ''))
  const [step, setStep] = useState(0)
  const [points, setPoints] = useState<XY[]>([])
  const [radiusInput, setRadiusInput] = useState(String(template.profileRadiusM))
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set())
  const [visibleWells, setVisibleWells] = useState(40)
  const [title, setTitle] = useState('')
  const [geoBlock, setGeoBlock] = useState('')
  const [techBlock, setTechBlock] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const titleField = useRef<HTMLInputElement>(null)
  const titleHint = useId()
  const radiusError = useId()
  const saved = useRef(false)
  const dirty = points.length > 0 || Boolean(title.trim())
  const blocker = useBlocker({ withResolver: true, disabled: !dirty, enableBeforeUnload: dirty, shouldBlockFn: () => !saved.current })
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [step])

  const { scene, sampleProfile, catalogue } = useMemo(() => {
    const plan = sectionPlan(template)
    return {
      scene: { ...plan, objects: plan.objects.filter(object => object.kind !== 'profile') },
      sampleProfile: plan.objects.find(object => object.kind === 'profile')!,
      catalogue: sectionWellCatalogue(template),
    }
  }, [template])
  const profile = useMemo(() => points.map(fromFieldPoint), [points])
  const radius = radiusInput.trim() ? Number(radiusInput) : NaN
  const validRadius = Number.isFinite(radius) && radius >= 0 && radius <= 100000
  const candidates = useMemo(() => step > 0 && validRadius ? wellsAlongSection(catalogue, profile, radius) : [], [catalogue, profile, radius, step, validRadius])
  const selected = useMemo(() => candidates.filter(well => !excluded.has(well.id)), [candidates, excluded])
  const selectedIds = useMemo(() => selected.map(well => well.id), [selected])
  const preview = useMemo(() => step === 2 ? constructSection(template, profile, radius, selected) : null, [profile, radius, selected, step, template])
  const length = profileLength(profile)

  const goTo = (next: number) => { setFeedback(''); setError(''); setStep(next) }
  const addPoint = (point: XY) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return
    if (points.length && distance(points.at(-1)!, point) < .001) { setFeedback('Эта точка совпадает с предыдущей. Укажите другую.'); return }
    setPoints([...points, point])
    setFeedback('')
  }
  const addCoordinates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    addPoint({ x: Number(form.get('x')), y: Number(form.get('y')) })
    event.currentTarget.reset()
  }
  const toggleWell = (id: string) => {
    if (!candidates.some(well => well.id === id)) { setFeedback('Скважина вне полосы захвата. Измените расстояние до трассы, чтобы включить её.'); return }
    setExcluded(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFeedback('')
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saved.current || !preview) return
    if (!title.trim()) {
      setSubmitted(true)
      titleField.current?.focus()
      return
    }
    const createdOn = new Date().toLocaleDateString('sv-SE')
    saved.current = true
    try {
      onSave({ ...preview, title: title.trim(), year: Number(createdOn.slice(0, 4)), metadata: { depositBody: '', createdOn, compiledBy: '', checkedBy: '', geoBlock, techBlock } })
    } catch (problem) {
      saved.current = false
      setError(problem instanceof Error ? problem.message : 'Не удалось сохранить разрез.')
    }
  }
  const traceInstruction = points.length === 0 ? 'Нажмите на карте, чтобы поставить начало трассы.'
    : points.length === 1 ? 'Поставьте вторую точку. Она задаст направление разреза.'
      : 'Добавьте точки для поворотов или перейдите к подбору скважин.'

  return <section className="section-construction" aria-label="Построение разреза">
    <header className="section-construction__header">
      <Button variant="quiet" size="sm" onClick={onCancel}><ArrowLeft size={16} />К разрезам</Button>
      <div><h1>Новый разрез</h1><p>{template.depositName}</p></div>
      <ol aria-label="Этапы построения">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-complete={step > index}><span>{step > index ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
    </header>
    <div className="section-construction__body">
      {step === 2 && preview
        ? selected.length ? <SectionConstructionPreview section={preview} length={length} /> : <p className="section-construction__empty">Скважины не включены в разрез</p>
        : <SectionConstructionMap scene={scene} sampleProfile={sampleProfile} points={points} pickingWells={step === 1} radius={step === 1 && validRadius ? radius : undefined} selectedWells={selectedIds} onPoint={addPoint} onWell={toggleWell} />}

      <aside className="section-construction__panel" aria-label={steps[step]}>
        <h2 ref={heading} tabIndex={-1}>{['Задайте трассу', 'Проверьте состав', 'Проверьте разрез'][step]}</h2>
        {step === 0 && <>
          <p className="section-construction__instruction" aria-live="polite">{traceInstruction}</p>
          <div className="section-construction__metrics"><span>Точек <strong>{points.length}</strong></span><span>Длина <strong>{planNumber(length)} м</strong></span></div>
          {points.length > 0 && <ol className="section-construction__vertices" aria-label="Точки трассы">{points.map((point, index) => <li key={index}><strong>{profileVertexName(index)}</strong><span>X {planNumber(point.x)}<br />Y {planNumber(point.y)}</span></li>)}</ol>}
          <div className="section-construction__actions" data-tooltip-group role="group" aria-label="Действия с трассой">
            <SectionToolButton icon={Undo2} label="Убрать последнюю точку" disabled={!points.length} onClick={() => { setPoints(points.slice(0, -1)); setFeedback('') }} />
            <SectionToolButton icon={Trash2} label="Очистить трассу" variant="quiet" disabled={!points.length} onClick={() => { setPoints([]); setFeedback('') }} />
          </div>
          <details className="section-construction__coordinates">
            <summary>Ввести координаты точки</summary>
            <form onSubmit={addCoordinates}>
              <label className="section-search"><span>X, м <em aria-hidden="true">*</em></span><input name="x" type="number" step="any" required /></label>
              <label className="section-search"><span>Y, м <em aria-hidden="true">*</em></span><input name="y" type="number" step="any" required /></label>
              <SectionToolButton icon={Plus} label="Добавить точку по координатам" type="submit" />
            </form>
          </details>
        </>}
        {step === 1 && <>
          <p className="section-construction__instruction">Включены скважины, чьи устья попали в полосу вдоль трассы. Каждая относится к ближайшему сегменту. Измените захват или снимите отметки на карте и в списке.</p>
          <label className="section-search"><span>Захват в каждую сторону, м <em aria-hidden="true">*</em></span><input required type="number" min="0" max="100000" step="any" value={radiusInput} aria-invalid={!validRadius || undefined} aria-describedby={!validRadius ? radiusError : undefined} onChange={event => { setRadiusInput(event.target.value); setFeedback(''); setVisibleWells(40) }} /></label>
          <div className="section-construction__metrics" aria-live="polite"><span>Найдено <strong>{candidates.length}</strong></span><span>В разрезе <strong>{selected.length}</strong></span></div>
          {candidates.length > 0 && <div className="section-construction__wells"><table aria-label="Скважины в полосе захвата">
            <thead><tr><th scope="col">Скважина</th><th scope="col">До трассы</th></tr></thead>
            <tbody>{candidates.slice(0, visibleWells).map(well => <tr key={well.id}><td><label><input type="checkbox" aria-label={`Включить ${well.name}`} checked={!excluded.has(well.id)} onChange={() => toggleWell(well.id)} /><span><strong>{well.name}</strong><small>Сегмент {well.segment + 1} · {planNumber(well.station)} м от начала</small></span></label></td><td>{planNumber(well.distance)} м</td></tr>)}</tbody>
          </table>{visibleWells < candidates.length && <div className="section-construction__more"><SectionToolButton icon={ChevronsDown} variant="quiet" label="Показать ещё скважины" onClick={() => setVisibleWells(count => count + 40)} /></div>}</div>}
          {!validRadius ? <p id={radiusError} className="section-error" role="alert">Введите расстояние от 0 до 100 000 м.</p>
            : candidates.length === 0 && <p className="section-construction__instruction">В полосе нет скважин. Увеличьте захват или измените трассу.</p>}
        </>}
        {step === 2 && preview && <>
          <form id="section-construction-save" className="section-construction__save-form" onSubmit={save} noValidate>
            <div className="section-construction__required">
              <label className="section-search"><span>Название разреза <em aria-hidden="true">*</em></span>
                <input ref={titleField} required maxLength={120} value={title} placeholder="Например, Северный · профиль 03" aria-describedby={titleHint} aria-invalid={submitted && !title.trim() || undefined} onChange={event => { setTitle(event.target.value); setError('') }} />
              </label>
              <p id={titleHint} role={submitted && !title.trim() ? 'alert' : undefined}>{submitted && !title.trim() ? 'Введите название разреза.' : 'Обязательное поле для сохранения разреза.'}</p>
            </div>
            <details className="section-construction__coordinates"><summary>Привязка к блокам <span>необязательно</span></summary>
              <label className="section-search">Геологический блок<select value={geoBlock} onChange={event => setGeoBlock(event.target.value)}><option value="">Не выбран</option>{geoBlocks.map(block => <option key={block}>{block}</option>)}</select></label>
              <label className="section-search">Технологический блок<select value={techBlock} onChange={event => setTechBlock(event.target.value)}><option value="">Не выбран</option>{techBlocks.map(block => <option key={block}>{block}</option>)}</select></label>
            </details>
          </form>
          {error && <p className="section-error" role="alert">{error}</p>}
          <p className="section-construction__instruction">{selected.length ? 'Колонки расположены по расстоянию от начала трассы. Высоты подобраны по устьям и забоям выбранных скважин.' : 'Вернитесь к подбору или сохраните трассу и добавьте скважины позже.'}</p>
          <dl className="section-construction__summary"><dt>Длина трассы</dt><dd>{planNumber(length)} м</dd><dt>Сегменты</dt><dd>{profile.length - 1}</dd><dt>Скважины</dt><dd>{selected.length}</dd><dt>Диапазон Z</dt><dd>{planNumber(preview.bottom)}…{planNumber(preview.top)} м</dd></dl>
        </>}
        {feedback && <p className="section-construction__instruction" role="status">{feedback}</p>}
      </aside>
    </div>
    <footer className="section-construction__footer">
      {step > 0 ? <Button variant="secondary" onClick={() => goTo(step - 1)}><ArrowLeft size={16} />{step === 1 ? 'К трассе' : 'К скважинам'}</Button> : <Button variant="quiet" onClick={onCancel}>Отмена</Button>}
      {step === 0 && <Button disabled={points.length < 2} onClick={() => goTo(1)}>К подбору скважин<ArrowRight size={16} /></Button>}
      {step === 1 && <Button disabled={!validRadius} onClick={() => goTo(2)}>Посмотреть разрез<ArrowRight size={16} /></Button>}
      {step === 2 && <Button type="submit" form="section-construction-save"><Save size={16} />Сохранить разрез</Button>}
    </footer>
    {blocker?.status === 'blocked' && <DiscardChangesDialog description="Трасса и выбранные скважины ещё не сохранены. Вернитесь к построению или выйдите из черновика." onStay={blocker.reset} onDiscard={blocker.proceed} />}
  </section>
}

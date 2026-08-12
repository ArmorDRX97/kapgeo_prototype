import { Link } from '@tanstack/react-router'
import { Calculator, CheckCircle2, FileOutput, Layers3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

type Input = { label: string; value: number; set: (value: number) => void; step: number }

export function ReservesPage() {
  const [area, setArea] = useState(1.84)
  const [thickness, setThickness] = useState(8.6)
  const [density, setDensity] = useState(2.71)
  const [grade, setGrade] = useState(1.42)
  const [submitted, setSubmitted] = useState(false)
  const tonnes = useMemo(() => area * 1_000_000 * thickness * density / 1000, [area, thickness, density])
  const metal = tonnes * grade / 100
  const inputs: Input[] = [
    { label: 'Контур, км²', value: area, set: setArea, step: .01 },
    { label: 'Средняя мощность, м', value: thickness, set: setThickness, step: .1 },
    { label: 'Плотность, т/м³', value: density, set: setDensity, step: .01 },
    { label: 'Содержание, %', value: grade, set: setGrade, step: .01 },
  ]

  return <div className="page-stack">
    <PageHeader eyebrow="Геологический модуль · GEO-21" title="Проект подсчёта запасов" description="Расчёт по утверждённому разрезу PR-07. Все исходные параметры видимы до передачи на review." meta={<Badge tone={submitted ? 'success' : 'warning'} dot>{submitted ? 'На согласовании' : 'Черновик v0.3'}</Badge>} actions={<Link to="/geology/delivery" className="button button--secondary button--md"><Layers3 size={17} />К публикации</Link>} />
    <div className="reserves-layout">
      <Panel title="Исходные параметры" description="Замените значения — итог пересчитается сразу."><div className="reserves-form">{inputs.map((input) => <label key={input.label}><span>{input.label}</span><input type="number" value={input.value} step={input.step} min="0" onChange={(event) => { input.set(Number(event.target.value)); setSubmitted(false) }} /></label>)}</div><div className="reserves-source"><CheckCircle2 size={18} />Источники: утверждённый разрез A–A′, WELL‑1010/1042/1038, интерпретация v12.</div></Panel>
      <aside className="reserves-aside"><Panel title="Результат расчёта" description="Категория C1"><div className="reserves-result"><Calculator size={24} /><strong>{Math.round(tonnes).toLocaleString('ru-RU')} т</strong><span>геологические запасы руды</span><b>{Math.round(metal).toLocaleString('ru-RU')} т</b><span>содержимого металла</span></div><p className="reserves-formula">S × h × ρ = тоннаж; тоннаж × содержание = металл.</p><button className="button button--primary button--md" type="button" onClick={() => setSubmitted(true)} disabled={submitted}><FileOutput size={16} />{submitted ? 'Передано на review' : 'Передать на review'}</button></Panel><Panel title="Контроль передачи" description="Состояние зависимостей"><div className="correlation-checks"><div><Badge tone="success">Готово</Badge><span>Все три скважины имеют опубликованные интервалы.</span></div><div><Badge tone="success">Готово</Badge><span>Корреляция профиля подтверждена экспертом.</span></div></div></Panel></aside>
    </div>
  </div>
}

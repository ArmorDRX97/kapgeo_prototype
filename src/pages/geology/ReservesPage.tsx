import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Calculator, CheckCircle2, FileOutput, Layers3 } from 'lucide-react'
import { useState } from 'react'
import { fetchReserveDraft, saveReserveDraft } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { ReserveProjectWorkspaceView } from './components/ReserveProjectWorkspaceView'

export function ReservesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['reserve-draft'], queryFn: fetchReserveDraft })
  const [editing, setEditing] = useState(false)
  const saveMutation = useMutation({ mutationFn: () => saveReserveDraft(query.data!, { ...query.data!, submitted: true }), onSuccess: (next) => queryClient.setQueryData(['reserve-draft'], next) })
  const draft = query.data
  const tonnes = draft ? draft.area * 1_000_000 * draft.thickness * draft.density / 1000 : 0
  const metal = draft ? tonnes * draft.grade / 100 : 0
  if (query.isLoading || !draft) return <div className="page-loading"><span /><p>Загружаем сохранённый проект запасов…</p></div>
  const update = (key: 'area' | 'thickness' | 'density' | 'grade', value: number) => { setEditing(true); queryClient.setQueryData(['reserve-draft'], { ...draft, [key]: value, submitted: false }) }
  const inputs: Array<{ label: string; key: 'area' | 'thickness' | 'density' | 'grade'; step: number }> = [{ label: 'Контур, км²', key: 'area', step: .01 }, { label: 'Средняя мощность, м', key: 'thickness', step: .1 }, { label: 'Плотность, т/м³', key: 'density', step: .01 }, { label: 'Содержание, %', key: 'grade', step: .01 }]
  return <div className="page-stack"><ReserveProjectWorkspaceView /><PageHeader eyebrow="Геологический модуль · GEO-21" title="Проект подсчёта запасов" description="Демонстрационный preview по утверждённому разрезу PR-07. Не предназначен для производственных решений." meta={<Badge tone={draft.submitted ? 'success' : 'warning'} dot>{draft.submitted ? 'На согласовании' : `Черновик v${draft.revision}`}</Badge>} actions={<Link to="/geology/delivery" className="button button--secondary button--md"><Layers3 size={17} />К публикации</Link>} />
    <div className="reserves-layout"><Panel title="Исходные параметры" description="Измените значения и передайте сохраняемый synthetic draft на review."><div className="reserves-form">{inputs.map((input) => <label key={input.key}><span>{input.label}</span><input type="number" value={draft[input.key]} step={input.step} min="0" onChange={(event) => update(input.key, Number(event.target.value))} /></label>)}</div><div className="reserves-source"><CheckCircle2 size={18} />Источники: утверждённый разрез A–A′, WELL‑1010/1042/1038, интерпретация v12.</div></Panel>
      <aside className="reserves-aside"><Panel title="Результат расчёта" description="DEMO / НЕ ДЛЯ ПРОИЗВОДСТВЕННЫХ РЕШЕНИЙ"><div className="reserves-result"><Calculator size={24} /><strong>{Math.round(tonnes).toLocaleString('ru-RU')} т</strong><span>геологические запасы руды</span><b>{Math.round(metal).toLocaleString('ru-RU')} т</b><span>содержимого металла</span></div><p className="reserves-formula">S × h × ρ = тоннаж; тоннаж × содержание = металл.</p><button className="button button--primary button--md" type="button" onClick={() => void saveMutation.mutate()} disabled={draft.submitted || saveMutation.isPending || !editing}><FileOutput size={16} />{draft.submitted ? 'Передано на review' : 'Передать на review'}</button></Panel></aside>
    </div>
  </div>
}
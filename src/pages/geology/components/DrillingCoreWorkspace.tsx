import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Box, Camera, Check, CircleAlert, Drill, FlaskConical, Plus, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calculateRecovery, validateDepthIntervals } from '../../../entities/well/lib/validateDepthIntervals'
import type { CoreBox, DrillingRun, Well, WellTechnicalData } from '../../../entities/well/model/types'
import { fetchWellTechnicalData, saveWellTechnicalData } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

export function DrillingCoreWorkspace({ well }: { well: Well }) {
  const { data, isLoading } = useQuery({ queryKey: ['well-technical', well.id], queryFn: () => fetchWellTechnicalData(well.id) })
  if (isLoading || !data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем рейсы бурения…</p></div>
  return <DrillingEditor well={well} initialData={data} />
}

function DrillingEditor({ well, initialData }: { well: Well; initialData: WellTechnicalData }) {
  const [runs, setRuns] = useState(initialData.drillingRuns)
  const [boxes, setBoxes] = useState(initialData.coreBoxes)
  const [selectedId, setSelectedId] = useState(initialData.drillingRuns[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const selected = runs.find((run) => run.id === selectedId)
  const issues = useMemo(() => validateDepthIntervals(runs, well.depth, true), [runs, well.depth])
  const blockingIssues = issues.filter((issue) => issue.severity === 'error')
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => saveWellTechnicalData(well.id, { ...initialData, drillingRuns: runs, coreBoxes: boxes }),
    onSuccess: (technical) => {
      queryClient.setQueryData(['well-technical', well.id], technical)
      setSaved(true)
    },
  })

  const updateRun = (id: string, patch: Partial<DrillingRun>) => setRuns((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const addRun = () => {
    const lastTo = runs.length ? Math.max(...runs.map((run) => run.to)) : 0
    if (runs.length && lastTo >= well.depth) {
      const last = [...runs].sort((a, b) => a.to - b.to).at(-1)!
      const splitAt = Math.max(last.from + 1, Number((last.to - Math.min(20, (last.to - last.from) / 2)).toFixed(1)))
      const run: DrillingRun = { ...last, id: `RUN-${Date.now()}`, from: splitAt, coreRecovered: Number(((last.to - splitAt) * 0.85).toFixed(1)) }
      setRuns((items) => [...items.map((item) => item.id === last.id ? { ...item, to: splitAt, coreRecovered: Math.min(item.coreRecovered, Number(((splitAt - item.from) * 0.9).toFixed(1))) } : item), run])
      setSelectedId(run.id)
      setSaved(false)
      return
    }
    const from = Math.min(well.depth, lastTo)
    const to = Math.min(well.depth, from + 40)
    const run: DrillingRun = { id: `RUN-${Date.now()}`, from, to, method: 'Колонковое', diameter: well.casingDiameter, coreRecovered: Number(((to - from) * 0.85).toFixed(1)) }
    setRuns((items) => [...items, run])
    setSelectedId(run.id)
    setSaved(false)
  }
  const addBox = () => {
    const last = boxes.at(-1)
    const from = last?.to ?? selected?.from ?? 0
    const to = Math.min(well.depth, from + 14)
    const box: CoreBox = { id: `BOX-${Date.now()}`, number: `BX-${121 + boxes.length}`, from, to, storage: 'Кернохранилище A · не размещено', photos: 0, samples: 0, description: 'Новая коробка — требуется описание.' }
    setBoxes((items) => [...items, box])
    setSaved(false)
  }

  return (
    <div className="object-workspace drilling-workspace">
      {saved && <div className="success-banner"><Check size={17} /><span><strong>Данные бурения сохранены</strong>Черновик синхронизирован с глубинным представлением.</span><button type="button" onClick={() => setSaved(false)}>Закрыть</button></div>}
      <div className="drilling-layout">
        <Panel className="drilling-depth-panel" title="Глубинный профиль" description={`${well.code} · 0–${well.depth} м`}>
          {runs.length ? <div className="drilling-depth-track">
            <div className="drilling-depth-track__scale">{[0, .25, .5, .75, 1].map((ratio) => <span key={ratio} style={{ top: `${ratio * 100}%` }}>{Math.round(well.depth * ratio)} м</span>)}</div>
            <div className="drilling-depth-track__runs">{runs.map((run) => <button type="button" key={run.id} className={selectedId === run.id ? 'is-selected' : ''} style={{ top: `${run.from / well.depth * 100}%`, height: `${Math.max(3, (run.to - run.from) / well.depth * 100)}%` }} onClick={() => setSelectedId(run.id)}><span>{run.method}</span><small>{run.from}–{run.to} м</small></button>)}</div>
            <div className="drilling-depth-track__core">{boxes.map((box) => <span key={box.id} style={{ top: `${box.from / well.depth * 100}%`, height: `${Math.max(2, (box.to - box.from) / well.depth * 100)}%` }} title={`${box.number}: ${box.from}–${box.to} м`} />)}</div>
          </div> : <div className="empty-result"><Drill size={24} /><strong>Рейсы ещё не добавлены</strong><span>Создайте первый интервал бурения от устья до текущего забоя.</span></div>}
        </Panel>

        <div className="drilling-layout__main">
          <Panel title="Рейсы бурения" description="GEO-07 · интервалы, способ, диаметр и выход керна" action={<Button size="sm" variant="secondary" onClick={addRun}><Plus size={14} /> Добавить рейс</Button>}>
            <div className="drilling-table">
              <div className="drilling-table__head"><span>Рейс</span><span>Интервал</span><span>Способ</span><span>Ø</span><span>Выход керна</span></div>
              {runs.map((run, index) => <button type="button" key={run.id} className={selectedId === run.id ? 'is-selected' : ''} onClick={() => setSelectedId(run.id)}><span><strong>Рейс {index + 1}</strong><small>{run.id}</small></span><span>{run.from}–{run.to} м</span><span>{run.method}</span><span>{run.diameter} мм</span><span><strong>{calculateRecovery(run.from, run.to, run.coreRecovered).toFixed(1)}%</strong><small>{run.coreRecovered} м</small></span></button>)}
            </div>
            {selected && <div className="run-inspector"><div className="run-inspector__title"><Drill size={17} /><strong>Редактирование {selected.id}</strong><Badge tone="info">Выбран на треке</Badge></div><div className="run-form-grid"><label><span>От, м</span><input type="number" value={selected.from} onChange={(event) => { updateRun(selected.id, { from: Number(event.target.value) }); setSaved(false) }} /></label><label><span>До, м</span><input type="number" value={selected.to} onChange={(event) => { updateRun(selected.id, { to: Number(event.target.value) }); setSaved(false) }} /></label><label><span>Способ</span><select value={selected.method} onChange={(event) => { updateRun(selected.id, { method: event.target.value as DrillingRun['method'] }); setSaved(false) }}><option>Роторное</option><option>Колонковое</option><option>Шнековое</option></select></label><label><span>Диаметр, мм</span><input type="number" value={selected.diameter} onChange={(event) => { updateRun(selected.id, { diameter: Number(event.target.value) }); setSaved(false) }} /></label><label><span>Получено керна, м</span><input type="number" value={selected.coreRecovered} onChange={(event) => { updateRun(selected.id, { coreRecovered: Number(event.target.value) }); setSaved(false) }} /></label></div></div>}
            {issues.length > 0 && <div className="validation-list">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`validation-item validation-item--${issue.severity}`}>{issue.severity === 'error' ? <CircleAlert size={15} /> : <AlertTriangle size={15} />}<span>{issue.message}</span></div>)}</div>}
          </Panel>

          <Panel title="Керновые коробки" description="GEO-08 · хранение, фотографии и связь с пробами" action={<Button size="sm" variant="secondary" onClick={addBox}><Plus size={14} /> Добавить коробку</Button>}>
            {boxes.length ? <div className="core-box-grid">{boxes.map((box) => <article key={box.id}><span className="core-box-grid__icon"><Box size={18} /></span><div><strong>{box.number}</strong><span>{box.from}–{box.to} м</span><small>{box.storage}</small><p>{box.description}</p></div><div className="core-box-grid__meta"><span><Camera size={13} /> {box.photos}</span><span><FlaskConical size={13} /> {box.samples}</span></div></article>)}</div> : <div className="empty-result"><Box size={23} /><strong>Керновых коробок нет</strong><span>Добавьте коробку и свяжите её с интервалом рейса.</span></div>}
          </Panel>
        </div>
      </div>
      <div className="workspace-savebar"><div><strong>{blockingIssues.length ? `${blockingIssues.length} блокирующих ошибок` : 'Интервалы готовы к сохранению'}</strong><span>{issues.filter((issue) => issue.severity === 'warning').length} предупреждений требуют проверки</span></div><Button disabled={blockingIssues.length > 0 || mutation.isPending} onClick={() => mutation.mutate()}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : 'Сохранить черновик'}</Button></div>
    </div>
  )
}

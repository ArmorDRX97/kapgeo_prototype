import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Copy, GitCompareArrows, LayoutTemplate, Merge, Plus, Redo2, Save, Scissors, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mergeLithologyIntervals, splitLithologyInterval } from '../../../entities/well/lib/lithologyIntervals'
import { validateDepthIntervals } from '../../../entities/well/lib/validateDepthIntervals'
import type { GeologicalInterval, Lithology, StratigraphyUnit, Well, WellGeologyData } from '../../../entities/well/model/types'
import { fetchWellGeologyData, saveWellGeologyData } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const lithologyOptions: Lithology[] = ['Суглинок', 'Песчаник', 'Алевролит', 'Глина', 'Рудный песчаник']
const stratigraphyOptions: StratigraphyUnit[] = ['Q', 'K2', 'K1', 'J3']

const lithologyTone: Record<Lithology, string> = {
  'Суглинок': 'lithology--loam',
  'Песчаник': 'lithology--sandstone',
  'Алевролит': 'lithology--siltstone',
  'Глина': 'lithology--clay',
  'Рудный песчаник': 'lithology--ore',
}

export function LithologyWorkspace({ well }: { well: Well }) {
  const { data, isLoading } = useQuery({ queryKey: ['well-geology', well.id], queryFn: () => fetchWellGeologyData(well.id) })
  if (isLoading || !data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем литологические интервалы…</p></div>
  return <LithologyEditor well={well} initialData={data} />
}

function LithologyEditor({ well, initialData }: { well: Well; initialData: WellGeologyData }) {
  const [intervals, setIntervals] = useState(initialData.intervals)
  const [baseline, setBaseline] = useState(initialData.intervals)
  const [history, setHistory] = useState<GeologicalInterval[][]>([])
  const [future, setFuture] = useState<GeologicalInterval[][]>([])
  const [selectedId, setSelectedId] = useState(initialData.intervals[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const [template, setTemplate] = useState('Стандартная разведочная')
  const [templateSaved, setTemplateSaved] = useState(false)
  const queryClient = useQueryClient()
  const sorted = useMemo(() => [...intervals].sort((a, b) => a.from - b.from), [intervals])
  const selectedIndex = sorted.findIndex((item) => item.id === selectedId)
  const selected = sorted[selectedIndex]
  const next = selectedIndex >= 0 ? sorted[selectedIndex + 1] : undefined
  const previous = selectedIndex > 0 ? sorted[selectedIndex - 1] : undefined
  const issues = useMemo(() => validateDepthIntervals(sorted, well.depth, true), [sorted, well.depth])
  const blockingIssues = issues.filter((item) => item.severity === 'error')
  const changed = JSON.stringify(sorted) !== JSON.stringify(baseline)
  const mutation = useMutation({
    mutationFn: () => saveWellGeologyData(well.id, { baseVersion: initialData.baseVersion, intervals: sorted }),
    onSuccess: (data) => {
      queryClient.setQueryData(['well-geology', well.id], data)
      setBaseline(data.intervals)
      setSaved(true)
    },
  })

  const commit = (nextIntervals: GeologicalInterval[], focusId = selectedId) => {
    setHistory((items) => [...items, intervals])
    setIntervals(nextIntervals)
    setFuture([])
    setSelectedId(focusId)
    setSaved(false)
  }
  const update = (id: string, patch: Partial<GeologicalInterval>) => commit(intervals.map((item) => item.id === id ? { ...item, ...patch } : item), id)
  const undo = () => {
    const previousState = history.at(-1)
    if (!previousState) return
    setFuture((items) => [intervals, ...items])
    setIntervals(previousState)
    setHistory((items) => items.slice(0, -1))
    setSelectedId(previousState[0]?.id ?? '')
    setSaved(false)
  }
  const redo = () => {
    const nextState = future[0]
    if (!nextState) return
    setHistory((items) => [...items, intervals])
    setIntervals(nextState)
    setFuture((items) => items.slice(1))
    setSelectedId(nextState[0]?.id ?? '')
    setSaved(false)
  }
  const split = () => {
    if (!selected) return
    const result = splitLithologyInterval(selected, Number(((selected.from + selected.to) / 2).toFixed(1)))
    if (!result) return
    commit(intervals.flatMap((item) => item.id === selected.id ? result : [item]), result[1].id)
  }
  const merge = () => {
    if (!selected || !next) return
    const result = mergeLithologyIntervals(selected, next)
    if (!result) return
    commit(intervals.filter((item) => item.id !== selected.id && item.id !== next.id).concat(result), result.id)
  }
  const addGap = () => {
    const gap = sorted.find((item, index) => index > 0 && item.from > sorted[index - 1]!.to)
    const from = gap ? sorted[sorted.indexOf(gap) - 1]!.to : (sorted.at(-1)?.to ?? 0)
    const to = gap ? gap.from : Math.min(well.depth, from + 20)
    if (to <= from) return
    const item: GeologicalInterval = { id: `LITH-GAP-${sorted.length + 1}`, from, to, lithology: previous?.lithology ?? 'Песчаник', stratigraphy: previous?.stratigraphy ?? 'K2', description: 'Новый интервал — требуется описание.', source: 'Ручное описание' }
    commit([...intervals, item], item.id)
  }
  const copyPrevious = () => {
    if (!selected || !previous) return
    update(selected.id, { lithology: previous.lithology, stratigraphy: previous.stratigraphy, source: previous.source })
  }

  return <div className="object-workspace lithology-workspace">
    {saved && <div className="success-banner"><Check size={17} /><span><strong>Литологический черновик сохранён</strong>Изменения готовы к отправке на проверку.</span><button type="button" onClick={() => setSaved(false)}>Закрыть</button></div>}
    <div className="lithology-workspace__toolbar">
      <div><Badge tone="info">GEO-09</Badge><strong>Версия {initialData.baseVersion} · рабочий черновик</strong><span>Выберите интервал на колонке или в таблице, чтобы уточнить его описание.</span></div>
      <div className="lithology-workspace__actions"><Button size="sm" variant="secondary" disabled={!history.length} onClick={undo} aria-label="Отменить действие"><Undo2 size={15} /> Отменить</Button><Button size="sm" variant="secondary" disabled={!future.length} onClick={redo} aria-label="Повторить действие"><Redo2 size={15} /> Повторить</Button><Button size="sm" variant="secondary" onClick={addGap}><Plus size={15} /> Заполнить пропуск</Button></div>
    </div>
    <div className="lithology-layout">
      <Panel className="lithology-column-panel" title="Геологическая колонка" description={`0–${well.depth} м · цвет = литология`}>
        <div className="lithology-column">
          <div className="lithology-column__scale">{[0, .25, .5, .75, 1].map((ratio) => <span key={ratio} style={{ top: `${ratio * 100}%` }}>{Math.round(well.depth * ratio)} м</span>)}</div>
          <div className="lithology-column__track">
            {sorted.map((item) => <button key={item.id} type="button" className={`${lithologyTone[item.lithology]} ${selectedId === item.id ? 'is-selected' : ''}`} style={{ top: `${item.from / well.depth * 100}%`, height: `${Math.max(3, (item.to - item.from) / well.depth * 100)}%` }} onClick={() => setSelectedId(item.id)}><strong>{item.lithology}</strong><span>{item.from}–{item.to} м</span></button>)}
          </div>
          <div className="lithology-column__stratigraphy">{sorted.map((item) => <span key={item.id} style={{ top: `${item.from / well.depth * 100}%`, height: `${Math.max(3, (item.to - item.from) / well.depth * 100)}%` }}>{item.stratigraphy}</span>)}</div>
        </div>
        <div className="lithology-legend"><span><i className="lithology--sandstone" />Песчаник</span><span><i className="lithology--ore" />Рудный песчаник</span><span><i className="lithology--siltstone" />Алевролит</span></div>
      </Panel>
      <div className="lithology-layout__main">
        <Panel title="Интервалы литологии" description="Границы и классификация действуют для текущего черновика">
          <div className="lithology-table">
            <div className="lithology-table__head"><span>Интервал</span><span>Литология</span><span>Стратиграфия</span><span>Источник</span></div>
            {sorted.map((item) => <button key={item.id} type="button" className={selectedId === item.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}><span><strong>{item.from}–{item.to} м</strong><small>{item.id}</small></span><span><i className={lithologyTone[item.lithology]} />{item.lithology}</span><span>{item.stratigraphy}</span><span>{item.source}</span></button>)}
          </div>
          {selected ? <div className="lithology-inspector">
            <div className="lithology-inspector__title"><div><strong>Интервал {selected.from}–{selected.to} м</strong><span>Правка границ и атрибутов</span></div><Badge tone={selected.source === 'ГИС' ? 'ai' : 'info'}>{selected.source}</Badge></div>
            <div className="lithology-form-grid">
              <label><span>От, м</span><input type="number" value={selected.from} onChange={(event) => update(selected.id, { from: Number(event.target.value) })} /></label>
              <label><span>До, м</span><input type="number" value={selected.to} onChange={(event) => update(selected.id, { to: Number(event.target.value) })} /></label>
              <label><span>Литология</span><select value={selected.lithology} onChange={(event) => update(selected.id, { lithology: event.target.value as Lithology })}>{lithologyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Стратиграфия</span><select value={selected.stratigraphy} onChange={(event) => update(selected.id, { stratigraphy: event.target.value as StratigraphyUnit })}>{stratigraphyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="lithology-form-grid__wide"><span>Описание</span><textarea rows={2} value={selected.description} onChange={(event) => update(selected.id, { description: event.target.value })} /></label>
            </div>
            <div className="lithology-inspector__actions"><Button size="sm" variant="secondary" onClick={split}><Scissors size={15} /> Разделить пополам</Button><Button size="sm" variant="secondary" disabled={!next || Math.abs(selected.to - next.from) > .001} onClick={merge}><Merge size={15} /> Объединить со следующим</Button><Button size="sm" variant="quiet" disabled={!previous} onClick={copyPrevious}><Copy size={15} /> Скопировать сверху</Button></div>
          </div> : <div className="empty-result"><Plus size={23} /><strong>Нет описанных интервалов</strong><span>Заполните первый интервал или импортируйте описание керна.</span></div>}
          {issues.length > 0 && <div className="validation-list">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`validation-item validation-item--${issue.severity}`}><AlertTriangle size={15} /><span>{issue.message}</span></div>)}</div>}
        </Panel>
        <Panel title="Изменения перед сохранением" description="Diff относительно версии, из которой создан черновик">
          <div className="lithology-diff"><GitCompareArrows size={19} /><div><strong>{changed ? `Изменено интервалов: ${Math.abs(sorted.length - initialData.intervals.length) || 1}` : 'Изменений пока нет'}</strong><span>{changed ? 'Границы, классификация и описания будут сохранены как рабочий черновик.' : 'Выберите интервал и внесите уточнение. Undo/redo действует до сохранения.'}</span></div>{changed && <Badge tone="warning">Draft</Badge>}</div>
        </Panel>
      </div>
    </div>
    <Panel className="column-template" title="Шаблон геологической колонки" description="GEO-19 · состав треков сохраняется отдельно от данных скважины"><div className="column-template__content"><LayoutTemplate size={20} /><div><strong>{template}</strong><span>Литология · стратиграфия · интервалы проб · GR · ручная интерпретация</span></div><label><span>Шаблон</span><select value={template} onChange={(event) => { setTemplate(event.target.value); setTemplateSaved(false) }}><option>Стандартная разведочная</option><option>Контроль качества данных</option><option>Полевой сокращённый</option></select></label><Button size="sm" variant="secondary" onClick={() => setTemplateSaved(true)}><Save size={15} /> Сохранить вид</Button></div>{templateSaved && <div className="success-message"><Check size={16} /><span><strong>Шаблон сохранён</strong>Порядок и видимость треков применены; интервалы скважины не изменены.</span></div>}</Panel>
    <div className="workspace-savebar"><div><strong>{blockingIssues.length ? `${blockingIssues.length} блокирующих ошибок` : 'Литологические интервалы готовы к сохранению'}</strong><span>{issues.filter((item) => item.severity === 'warning').length ? 'Неописанные интервалы останутся предупреждением.' : 'Перекрытия и выход за глубину не обнаружены.'}</span></div><Button disabled={blockingIssues.length > 0 || mutation.isPending || !changed} onClick={() => mutation.mutate()}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : 'Сохранить черновик'}</Button></div>
  </div>
}

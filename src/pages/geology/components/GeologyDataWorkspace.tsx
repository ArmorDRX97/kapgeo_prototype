import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Beaker, Copy, Database, Download, FlaskConical, GitBranch, Plus, Redo2, Save, Undo2 } from 'lucide-react'
import { useState } from 'react'
import type { Well } from '../../../entities/well/model/types'
import type { GeologyTrackKind, WellGeologyWorkspace } from '../../../entities/well-geology/model/types'
import { fetchWellGeologyWorkspace, saveWellGeologyWorkspace } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const trackLabels: Record<GeologyTrackKind, string> = { core: 'Керн', log: 'ГИС', composite: 'Composite', stratigraphy: 'Стратиграфия' }

export function GeologyDataWorkspace({ well }: { well: Well }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['well-geology-v2', well.id], queryFn: () => fetchWellGeologyWorkspace(well.id) })
  const [draft, setDraft] = useState<WellGeologyWorkspace | null>(null)
  const [kind, setKind] = useState<GeologyTrackKind>('core')
  const [undo, setUndo] = useState<WellGeologyWorkspace[]>([])
  const [redo, setRedo] = useState<WellGeologyWorkspace[]>([])
  const workspace = draft ?? query.data
  const mutation = useMutation({ mutationFn: () => saveWellGeologyWorkspace(well.id, query.data!, draft!, draft!.lims.length ? 'geology.lims.reconciled' : draft!.samples.some((item) => item.number.includes('BATCH')) ? 'geology.batch.created' : 'geology.workspace.saved'), onSuccess: (next) => { setDraft(null); queryClient.setQueryData(['well-geology-v2', well.id], next) } })
  if (query.isError) return <div className="form-alert form-alert--error">Не удалось загрузить geological workspace: {String(query.error.message)}</div>
  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем tracks, пробы и лабораторию…</p></div>
  const track = workspace.tracks.find((item) => item.kind === kind)!
  const change = (next: WellGeologyWorkspace) => { setUndo((items) => [...items, structuredClone(workspace)]); setRedo([]); setDraft(next) }
  const undoDraft = () => { const previous = undo.at(-1); if (!previous) return; setRedo((items) => [...items, structuredClone(workspace)]); setDraft(previous); setUndo((items) => items.slice(0, -1)) }
  const redoDraft = () => { const next = redo.at(-1); if (!next) return; setUndo((items) => [...items, structuredClone(workspace)]); setDraft(next); setRedo((items) => items.slice(0, -1)) }
  const shiftStratigraphy = () => { const first = track.intervals[0]; if (!first) return; change({ ...workspace, tracks: workspace.tracks.map((item) => item.id === track.id ? { ...item, intervals: item.intervals.map((interval, index) => index === 0 ? { ...interval, to: interval.to + .5 } : index === 1 ? { ...interval, from: interval.from + .5 } : interval), version: item.version + 1 } : item) }) }
  const addOverride = () => { const interval = track.intervals[0]; if (!interval) return; change({ ...workspace, overrides: [...workspace.overrides, { id: `OVR-${workspace.overrides.length + 1}`, trackId: track.id, intervalId: interval.id, grouping: 'Полевая группа A', description: 'Synthetic description override', inheritsSource: false, version: 1 }] }) }
  const addSample = () => { const interval = track.intervals[0]; if (!interval) return; const index = workspace.samples.length + 1; change({ ...workspace, samples: [...workspace.samples, { id: `SMP-${well.id}-V2-${index}`, number: `${well.code}-BATCH-${index}`, wellId: well.id, from: interval.from, to: Math.min(interval.to, interval.from + 2), type: 'Керновая', status: 'Черновик', purpose: 'Химический анализ', linkedIntervals: [interval.id], linkedIntervalId: interval.id, depthSource: kind === 'composite' ? 'composite' : 'core', workflow: 'collection', version: 1, createdAt: 'Только что' }] }) }
  const advanceWorkflow = () => {
    const sample = workspace.samples[0]
    if (!sample) return
    const next = sample.workflow === 'collection' ? 'requested' : sample.workflow === 'requested' ? 'laboratory' : sample.workflow === 'laboratory' ? 'result' : sample.workflow === 'result' ? 'qa_accepted' : sample.workflow
    change({ ...workspace, samples: workspace.samples.map((item) => item.id === sample.id ? { ...item, workflow: next, version: item.version + 1 } : item), labResults: next === 'result' && !workspace.labResults.some((item) => item.sampleId === sample.id) ? [...workspace.labResults, { id: `LAB-${sample.id}`, sampleId: sample.id, analyte: 'U', value: 420, unit: 'мг/кг', method: 'Synthetic ICP-MS', analyst: 'Demo analyst', qaStatus: 'На проверке', uncertainty: 4.2 }] : workspace.labResults })
  }
  const applyLims = () => change({ ...workspace, lims: workspace.lims.map((item) => item.state === 'staged' && !item.conflictReason ? { ...item, state: 'applied' } : item) })
  const createBatch = () => {
    addSample()
  }
  const downloadLabels = () => {
    const labels = workspace.samples.map((sample) => `${sample.number};${well.code};${sample.from}-${sample.to}m`).join('\n')
    const url = URL.createObjectURL(new Blob([labels], { type: 'text/plain' }))
    const link = document.createElement('a'); link.href = url; link.download = `${well.code}-sample-labels.txt`; link.click(); URL.revokeObjectURL(url)
  }
  const stageLims = (conflict: boolean) => {
    const result = workspace.labResults[0]
    const sample = workspace.samples[0]
    if (!result || !sample) return
    change({ ...workspace, lims: [...workspace.lims, { id: `LIMS-${workspace.lims.length + 1}`, sampleId: sample.id, result, state: conflict ? 'conflict' : 'staged', conflictReason: conflict ? 'Значение U отличается от локального QC preview' : undefined }] })
  }
  const granulometry = workspace.granulometry[0]
  const total = granulometry?.bins.reduce((sum, bin) => sum + bin.massPercent, 0) ?? 0
  return <div className="object-workspace">
    {mutation.error && <div className="form-alert form-alert--error">{String(mutation.error.message)}</div>}
    <Panel title="Versioned geological tracks" description="GEOX-E04 · core / log / composite / stratigraphy сохраняются отдельно" action={<><Button size="sm" variant="quiet" disabled={!undo.length} onClick={undoDraft}><Undo2 size={14} /> Undo</Button><Button size="sm" variant="quiet" disabled={!redo.length} onClick={redoDraft}><Redo2 size={14} /> Redo</Button><Badge tone="info">Workspace v{workspace.version}</Badge></>}>
      <div className="saved-views">{workspace.tracks.map((item) => <button type="button" key={item.kind} className={item.kind === kind ? 'is-active' : ''} onClick={() => setKind(item.kind)}>{trackLabels[item.kind]} <small>v{item.version} · {item.source}</small></button>)}</div>
      <div className="drilling-table"><div className="drilling-table__head"><span>Интервал</span><span>Литология</span><span>Стратиграфия</span><span>Источник</span><span>Состояние</span></div>{track.intervals.map((item) => <div className="drilling-table__row" key={item.id}><span>{item.from}–{item.to} м</span><span>{item.lithology}</span><span>{item.stratigraphy}</span><span>{item.source}</span><span>{item.description ? 'описан' : 'no-data'}</span></div>)}</div>
      <div className="workflow-actions"><Button size="sm" variant="quiet" onClick={shiftStratigraphy}>Shift boundary</Button><Button size="sm" variant="quiet" onClick={() => change({ ...workspace, overrides: [...workspace.overrides, ...workspace.overrides.map((item) => ({ ...item, id: `${item.id}-COPY`, version: item.version + 1 }))] })}><Copy size={14} /> Copy override</Button><Button size="sm" variant="secondary" onClick={addOverride}><GitBranch size={14} /> Override / grouping</Button><Button size="sm" variant="secondary" onClick={addSample}><Plus size={14} /> Проба из интервала</Button><Button size="sm" variant="quiet" onClick={createBatch}>Batch create</Button><Button size="sm" variant="quiet" onClick={downloadLabels}><Download size={14} /> Labels</Button></div>
    </Panel>
    <div className="object-content-grid"><div className="object-content-grid__main"><Panel title="Справочники и effective version" description="RU/KZ/EN labels; архив не удаляет историю"><div className="domain-status-grid">{workspace.dictionaries.map((entry) => <article key={entry.id}><span className="domain-status-grid__icon"><Database size={17} /></span><div><strong>{entry.labels.ru}</strong><small>{entry.code} · действует с {entry.effectiveFrom} · v{entry.version}</small></div><Badge tone={entry.status === 'active' ? 'success' : 'neutral'}>{entry.status}</Badge></article>)}</div></Panel><Panel title="Sample → laboratory → QA/QC" description="Четыре семейства проб и несвязанный lab result не применяются"><div className="samples-table"><div className="samples-table__head"><span>Проба</span><span>Depth source</span><span>Workflow</span><span>Links</span></div>{workspace.samples.map((sample) => <div key={sample.id}><span>{sample.number}</span><span>{sample.depthSource}</span><span>{sample.workflow}</span><span>{sample.linkedIntervals.length} interval(s)</span></div>)}</div><div className="workflow-actions"><Button size="sm" variant="secondary" onClick={advanceWorkflow}>Следующий этап chain</Button><Button size="sm" variant="quiet" onClick={() => change({ ...workspace, samples: workspace.samples.map((item, index) => index === 0 ? { ...item, type: 'Дубликат' } : item) })}>QA duplicate scenario</Button></div>{workspace.labResults.length > 0 && <div className="validation-list" aria-label="Lab QA results">{workspace.labResults.map((result) => <div key={result.id} className="validation-item validation-item--info"><span><strong>{result.analyte}: {result.value} {result.unit}</strong><small>{result.method} · {result.analyst} · ±{result.uncertainty}% · {result.qaStatus}</small></span></div>)}</div>}</Panel></div><aside><Panel title="Гранулометрия" description="Synthetic SGA/d10/d60 · не производственная методика"><div className="version-impact"><span className="version-impact__icon"><Beaker size={20} /></span><div><strong>SGA {granulometry?.sga} · d10 {granulometry?.d10} · d60 {granulometry?.d60}</strong><p>Bins: {granulometry?.bins.map((bin) => `${bin.sizeMm} мм / ${bin.massPercent}%`).join(' · ')}. Сумма {total}%.</p><div className="granulometry-bars" aria-label="Synthetic granulometry histogram">{granulometry?.bins.map((bin) => <span key={bin.sizeMm}><i style={{ width: `${bin.massPercent}%` }} /><small>{bin.sizeMm} мм · cumulative {granulometry.bins.filter((item) => item.sizeMm <= bin.sizeMm).reduce((sum, item) => sum + item.massPercent, 0)}%</small></span>)}</div></div></div><div className="granulometry-actions"><Button size="sm" variant="secondary" onClick={() => change({ ...workspace, lims: [...workspace.lims, { id: `LIMS-${workspace.lims.length + 1}`, sampleId: workspace.samples[0]?.id ?? '', result: workspace.labResults[0]!, state: 'staged', conflictReason: 'Synthetic reconciliation preview' }] })}><FlaskConical size={14} /> LIMS staging preview</Button><Button size="sm" variant="quiet" onClick={() => stageLims(false)}>Staging без конфликта</Button><Button size="sm" variant="quiet" onClick={applyLims}>Применить non-conflict</Button></div>{workspace.lims.length > 0 && <div className="validation-list" aria-label="LIMS reconciliation">{workspace.lims.map((stage) => <div key={stage.id} className={`validation-item ${stage.conflictReason ? 'validation-item--warning' : 'validation-item--info'}`}><span><strong>{stage.sampleId}: {stage.state}</strong><small>{stage.conflictReason ?? 'Можно применить без перезаписи локальных данных'}</small></span></div>)}</div>}<p className="save-hint">Batch labels/barcodes и staging применяются как browser-only artifacts в следующем действии сохранения.</p></Panel></aside></div>
    <div className="workspace-savebar"><div><strong>{draft ? 'Есть несохранённые versioned изменения' : 'Workspace синхронизирован'}</strong><span>Audit и exact versions создаются после сохранения.</span></div><Button disabled={!draft || mutation.isPending} onClick={() => mutation.mutate()}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : 'Сохранить E04 draft'}</Button></div>
  </div>
}

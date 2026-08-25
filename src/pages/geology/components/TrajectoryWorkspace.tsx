import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, GitBranch, MapPin, Plus, Redo2, RotateCcw, Save, Undo2, Upload } from 'lucide-react'
import { useState } from 'react'
import type { Well } from '../../../entities/well/model/types'
import type { CoreRunV2, WellTrajectoryWorkspace as Workspace } from '../../../entities/well-trajectory/model/types'
import { fetchWellTrajectoryWorkspace, importWellTrajectoryFixture, saveWellTrajectoryWorkspace, selectWellTrajectorySurvey } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

function issues(data: Workspace, depth: number) {
  const result: Array<{ severity: 'error' | 'warning'; message: string }> = []
  const sorted = [...data.coreRuns].sort((a, b) => a.drillingFrom - b.drillingFrom)
  for (const run of sorted) {
    if (run.drillingFrom >= run.drillingTo || run.drillingFrom < 0 || run.drillingTo > depth) result.push({ severity: 'error', message: `Рейс ${run.drillingFrom}–${run.drillingTo} м вне допустимого диапазона.` })
    if (run.state === 'core' && (run.recovered < 0 || run.recovered > run.drillingTo - run.drillingFrom)) result.push({ severity: 'error', message: `Выход керна рейса ${run.id} невозможен.` })
    if (run.state === 'no-core') result.push({ severity: 'warning', message: `No-core ${run.drillingFrom}–${run.drillingTo} м сохранён явно.` })
  }
  for (let index = 1; index < sorted.length; index += 1) if (sorted[index]!.drillingFrom < sorted[index - 1]!.drillingTo) result.push({ severity: 'error', message: 'Рейсы керна перекрываются.' })
  if (data.activeResult.extrapolated) result.push({ severity: 'warning', message: 'Забой экстраполирован от последней станции survey.' })
  return result
}

export function TrajectoryWorkspace({ well }: { well: Well }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['well-trajectory', well.id], queryFn: () => fetchWellTrajectoryWorkspace(well.id) })
  const [selectedRunId, setSelectedRunId] = useState('')
  const [draft, setDraft] = useState<Workspace | null>(null)
  const [undo, setUndo] = useState<Workspace[]>([])
  const [redo, setRedo] = useState<Workspace[]>([])
  const [showImport, setShowImport] = useState(false)
  const workspace = draft ?? query.data
  const refresh = (next: Workspace) => { setDraft(null); queryClient.setQueryData(['well-trajectory', well.id], next) }
  const selectMutation = useMutation({ mutationFn: (id: string) => selectWellTrajectorySurvey(well.id, workspace!, id), onSuccess: (next) => { setShowImport(false); refresh(next) } })
  const importMutation = useMutation({ mutationFn: () => importWellTrajectoryFixture(well.id, workspace!), onSuccess: (next) => { setShowImport(false); refresh(next) } })
  const saveMutation = useMutation({ mutationFn: () => saveWellTrajectoryWorkspace(well.id, query.data!, draft!, 'trajectory.core.saved'), onSuccess: (next) => { setShowImport(false); refresh(next) } })
  if (query.isError) return <div className="form-alert form-alert--error" role="alert">Не удалось загрузить trajectory workspace: {String(query.error.message)}</div>
  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем траекторию и керн…</p></div>
  const validation = issues(workspace, well.depth)
  const blocking = validation.some((item) => item.severity === 'error')
  const selected = workspace.coreRuns.find((item) => item.id === (selectedRunId || workspace.coreRuns[0]?.id))
  const commitRuns = (runs: CoreRunV2[]) => { setUndo((items) => [...items, structuredClone(workspace)]); setRedo([]); setDraft({ ...workspace, coreRuns: runs }) }
  const updateRuns = (runs: CoreRunV2[]) => commitRuns(runs)
  const undoDraft = () => { const previous = undo.at(-1); if (!previous) return; setRedo((items) => [...items, structuredClone(workspace)]); setDraft(previous); setUndo((items) => items.slice(0, -1)) }
  const redoDraft = () => { const next = redo.at(-1); if (!next) return; setUndo((items) => [...items, structuredClone(workspace)]); setDraft(next); setRedo((items) => items.slice(0, -1)) }
  const updateRun = (id: string, patch: Partial<CoreRunV2>) => updateRuns(workspace.coreRuns.map((item) => item.id === id ? { ...item, ...patch } : item))
  const rebin = () => { setUndo((items) => [...items, structuredClone(workspace)]); setRedo([]); setDraft({ ...workspace, measurements: workspace.measurements.map((item) => item.missing ? item : { ...item, sizeMm: item.sizeMm ? Number((item.sizeMm * 2).toFixed(1)) : item.sizeMm, count: item.count ? Math.max(1, Math.round(item.count / 2)) : item.count }) }) }
  const command = (action: 'reverse' | 'stretch' | 'no-core' | 'split' | 'merge' | 'restore') => {
    const target = selected ?? workspace.coreRuns[0]
    if (!target) return
    if (action === 'no-core') updateRun(target.id, { state: 'no-core', interpretedTo: target.interpretedFrom, recovered: 0, version: target.version + 1 })
    if (action === 'restore') updateRun(target.id, { state: 'core', interpretedTo: target.drillingTo, recovered: Number(((target.drillingTo - target.drillingFrom) * .88).toFixed(1)), version: target.version + 1 })
    if (action === 'stretch') updateRun(target.id, { interpretedTo: Math.min(target.drillingTo, target.interpretedTo + 1), version: target.version + 1 })
    if (action === 'reverse') updateRuns(workspace.coreRuns.map((item) => item.id === target.id ? item : item).reverse())
    if (action === 'split' && target.drillingTo - target.drillingFrom > 4) { const mid = Number(((target.drillingFrom + target.drillingTo) / 2).toFixed(1)); updateRuns([...workspace.coreRuns.filter((item) => item.id !== target.id), { ...target, drillingTo: mid, interpretedTo: Math.min(mid, target.interpretedTo), version: target.version + 1 }, { ...target, id: `${target.id}-B`, drillingFrom: mid, interpretedFrom: mid, recovered: Number((target.recovered / 2).toFixed(1)), version: 1 }]) }
    if (action === 'merge') { const ordered = [...workspace.coreRuns].sort((a, b) => a.drillingFrom - b.drillingFrom); const index = ordered.findIndex((item) => item.id === target.id); const next = ordered[index + 1]; if (next && target.state === next.state) updateRuns([...ordered.filter((item) => item.id !== target.id && item.id !== next.id), { ...target, drillingTo: next.drillingTo, interpretedTo: next.interpretedTo, recovered: Number((target.recovered + next.recovered).toFixed(1)), version: target.version + 1 }]) }
  }
  const bottom = workspace.activeResult.points.at(-1)
  return <div className="object-workspace">
    {(selectMutation.error || importMutation.error || saveMutation.error) && <div className="form-alert form-alert--error">{String(selectMutation.error?.message ?? importMutation.error?.message ?? saveMutation.error?.message)}</div>}
    <div className="passport-layout"><div className="passport-layout__main">
      <Panel title="Инклинометрия и траектория" description="GEOX-E03 · deterministic client-side mean-angle, synthetic result" action={<Button size="sm" variant="secondary" disabled={importMutation.isPending} onClick={() => setShowImport(true)}><Upload size={14} /> Fixture import</Button>}>
        {showImport && <div className="validation-list" role="dialog" aria-label="Импорт инклинометрии"><div className="validation-item validation-item--warning"><AlertTriangle size={15} /><span><strong>Preview bundled/local fixture.</strong> Mapping: MD → глубина, INC → inclination, AZI → azimuth; 4 строки валидны, replace diff: новая candidate-версия, текущая active-версия не изменяется.</span></div><div className="workflow-actions"><Button size="sm" variant="quiet" onClick={() => setShowImport(false)}>Отмена</Button><Button size="sm" disabled={importMutation.isPending} onClick={() => importMutation.mutate()}><Upload size={14} /> Применить fixture и сохранить protocol</Button></div></div>}        <div className="saved-views" aria-label="Наборы инклинометрии">{workspace.surveys.map((survey) => <button type="button" key={survey.id} className={survey.id === workspace.selectedSurveyId ? 'is-active' : ''} disabled={selectMutation.isPending} onClick={() => selectMutation.mutate(survey.id)}>{survey.code} <small>{survey.method} · v{survey.version}</small></button>)}</div>
        <div className="domain-status-grid"><article><span className="domain-status-grid__icon"><MapPin size={18} /></span><div><strong>Забой · synthetic</strong><small>MD {bottom?.md.toFixed(1)} м · TVD {bottom?.tvd.toFixed(1)} м · N {bottom?.northing.toFixed(1)} / E {bottom?.easting.toFixed(1)}</small></div><Badge tone={workspace.activeResult.extrapolated ? 'warning' : 'success'}>{workspace.activeResult.extrapolated ? 'Extrapolated' : 'Calculated'}</Badge></article></div>
        <div className="drilling-table"><div className="drilling-table__head"><span>MD</span><span>TVD</span><span>Northing</span><span>Easting</span><span>Источник</span></div>{workspace.activeResult.points.map((point) => <div className="drilling-table__row" key={point.md}><span>{point.md.toFixed(1)} м</span><span>{point.tvd.toFixed(1)} м</span><span>{point.northing.toFixed(1)}</span><span>{point.easting.toFixed(1)}</span><span>mean-angle</span></div>)}</div>        <div className="trajectory-preview-grid" aria-label="План и профиль траектории"><figure><figcaption>План · N/E</figcaption><svg viewBox="0 0 220 100" role="img" aria-label="План траектории">{workspace.activeResult.points.map((point, index, items) => index > 0 && <line key={point.md} x1={30 + items[index - 1]!.easting * 3} y1={70 - items[index - 1]!.northing * 3} x2={30 + point.easting * 3} y2={70 - point.northing * 3} stroke="currentColor" strokeWidth="3" />)}<circle cx="30" cy="70" r="4" /></svg></figure><figure><figcaption>Профиль · MD/TVD</figcaption><svg viewBox="0 0 220 100" role="img" aria-label="Профиль траектории">{workspace.activeResult.points.map((point, index, items) => index > 0 && <line key={point.md} x1={10 + items[index - 1]!.md / well.depth * 200} y1={10 + items[index - 1]!.tvd / well.depth * 80} x2={10 + point.md / well.depth * 200} y2={10 + point.tvd / well.depth * 80} stroke="currentColor" strokeWidth="3" />)}<circle cx="10" cy="10" r="4" /></svg></figure></div>
      </Panel>
      <Panel title="Керн и depth mapping" description="Drilling/interpreted range, recovery, bins, boxes и команды черновика" action={<><Button size="sm" variant="quiet" disabled={!undo.length} onClick={undoDraft}><Undo2 size={14} /> Undo</Button><Button size="sm" variant="quiet" disabled={!redo.length} onClick={redoDraft}><Redo2 size={14} /> Redo</Button><Button size="sm" variant="quiet" onClick={() => command('reverse')}>Reverse</Button><Button size="sm" variant="quiet" onClick={() => command('split')}><Plus size={14} /> Split</Button><Button size="sm" variant="quiet" onClick={() => command('merge')}>Merge</Button><Button size="sm" variant="quiet" onClick={rebin}>Rebin ×2</Button><Button size="sm" variant="quiet" onClick={() => command('no-core')}>No-core</Button><Button size="sm" variant="quiet" onClick={() => command('restore')}><RotateCcw size={14} /> Restore</Button></>}>
        <div className="drilling-table"><div className="drilling-table__head"><span>Рейс</span><span>Бурение</span><span>Интерпретация</span><span>Recovery</span><span>Состояние</span></div>{workspace.coreRuns.map((run) => <button type="button" key={run.id} className={run.id === selected?.id ? 'is-selected' : ''} onClick={() => setSelectedRunId(run.id)}><span>{run.id}</span><span>{run.drillingFrom}–{run.drillingTo} м</span><span>{run.interpretedFrom}–{run.interpretedTo} м</span><span>{run.recovered} м</span><Badge tone={run.state === 'core' ? 'success' : 'warning'}>{run.state}</Badge></button>)}</div>
        {selected && <div className="run-form-grid"><label><span>От бурения</span><input type="number" value={selected.drillingFrom} onChange={(e) => updateRun(selected.id, { drillingFrom: Number(e.target.value) })} /></label><label><span>До бурения</span><input type="number" value={selected.drillingTo} onChange={(e) => updateRun(selected.id, { drillingTo: Number(e.target.value) })} /></label><label><span>Получено</span><input type="number" value={selected.recovered} onChange={(e) => updateRun(selected.id, { recovered: Number(e.target.value) })} /></label><label><span>Команда</span><Button size="sm" variant="secondary" onClick={() => command('stretch')}>Stretch +1 м</Button></label></div>}
        <div className="core-box-grid">{workspace.boxes.map((box) => <article key={box.id}><span className="core-box-grid__icon"><GitBranch size={18} /></span><div><strong>{box.barcode}</strong><span>{box.from}–{box.to} м · {box.storage}</span><small>{box.photoLabel} · synthetic photo</small></div></article>)}</div>
      </Panel>
    </div><aside className="passport-layout__aside"><Panel title="QC и evidence" description="Публикация блокируется при errors."><div className="validation-list">{validation.map((item, index) => <div key={index} className={`validation-item validation-item--${item.severity}`}><AlertTriangle size={15} /><span>{item.message}</span></div>)}</div><p className="save-hint">Source/composite bins: {workspace.measurements.length}; missing semantics сохранена явно. Rebin, reorder/reverse, split/merge и restore — команды черновика. Impact preview: lithology core track и связанные samples сохранят source-range links; изменение core draft создаёт audit/version evidence.</p><Button variant="secondary" disabled={blocking || !draft || saveMutation.isPending} onClick={() => saveMutation.mutate()}><Save size={16} /> Сохранить depth draft</Button><Button variant="quiet" size="sm" onClick={() => { const csv = ['md,tvd,northing,easting', ...workspace.activeResult.points.map((p) => `${p.md},${p.tvd},${p.northing},${p.easting}`)].join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `${well.code}-trajectory.csv`; a.click(); URL.revokeObjectURL(url) }}><Download size={14} /> CSV export</Button></Panel></aside></div>
  </div>
}

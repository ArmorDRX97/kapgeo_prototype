import { profileWithBoundaries } from '../../entities/geology-section/lib/profileChange'
import { useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { Save, Undo2, Redo2, Trash2, Download } from 'lucide-react'
import type { GeologySection, SectionView } from '../../entities/geology-section/model/types'
import { sectionViews } from '../../entities/geology-section/model/types'
import { repairSection } from '../../entities/geology-section/lib/repair'
import { profileIssues } from '../../entities/geology-section/lib/profile'
import type { UserPersona } from '../../entities/session/model/types'
import { canEditSection, sectionRepository } from '../../repository/demo/sectionRepository'
import { Button } from '../../shared/ui/Button'
import { DiscardChangesDialog } from '../../shared/ui/DiscardChangesDialog'
import { WorkspaceTabs } from '../../shared/ui/WorkspaceTabs'
import { validateSectionSearch, type SectionSearch } from './model/search'
import { useSharedAuxiliary } from './model/useSharedAuxiliary'
import { staleAuxiliary } from '../../entities/geology-section/lib/sharedAuxiliary'
import { SectionSetup } from './ui/SectionSetup'
import { ProfileMap } from './ui/ProfileMap'
import { CorrelationEditor } from './ui/CorrelationEditor'
import { GraphicEditor } from './ui/GraphicEditor'
import { DrawingEditor } from './ui/DrawingEditor'
import { SectionGraphicWorkspace, PlotSurface } from './ui/SectionGraphicWorkspace'
import { SectionDocumentHeader } from './ui/SectionDocumentHeader'
import { reconcileProfile } from '../../entities/geology-section/lib/segments'
import './sections.css'

export function SectionWorkbench({ initial, persona, search, onSearch, onSaved, onDeleted, documents=[] }: { documents?:GeologySection[]; initial: GeologySection; persona: UserPersona | null; search: SectionSearch; onSearch: (next: SectionSearch) => void; onSaved: (section: GeologySection) => void; onDeleted?: () => void }) {
  const [section, setSection] = useState(initial), [saved, setSaved] = useState(initial)
  const [past, setPast] = useState<GeologySection[]>([]), [future, setFuture] = useState<GeologySection[]>([])
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [pendingGeometry, setPendingGeometry] = useState(false)
  const shared = useSharedAuxiliary(), stale = staleAuxiliary(section, shared.data ?? [])
  const editable = canEditSection(persona, saved), dirty = JSON.stringify(section) !== JSON.stringify(saved), view = search.view ?? 'overview'
  const routeBlocker = useBlocker({ withResolver: true, disabled: !dirty && !pendingGeometry, enableBeforeUnload: dirty || pendingGeometry, shouldBlockFn: ({ current, next }) => {
    const destination = validateSectionSearch(next.search as Record<string, unknown>)
    return next.pathname !== current.pathname || pendingGeometry && (destination.view !== search.view || destination.mode !== search.mode)
  } })
  const commit = (next: GeologySection) => {
    if (!editable) return
    const reconciled = reconcileProfile(section,JSON.stringify(section.profile)===JSON.stringify(next.profile)?next:profileWithBoundaries(next,next.profile))
    if (reconciled.lost && !window.confirm(`Изменение профиля снимет ${reconciled.lost} назначений скважин сегментам. Состав разреза сохранится. Продолжить?`)) return
    const repaired = repairSection(reconciled.section)
    setPast([...past.slice(-39), section]); setFuture([]); setSection(repaired.section); setError(''); setNotice(repaired.changes.join('. '))
  }
  const undo = () => { const previous = past.at(-1); if (previous) { setFuture([section, ...future]); setSection(previous); setPast(past.slice(0, -1)); setError(''); setNotice('Действие отменено') } }
  const redo = () => { const next = future[0]; if (next) { setPast([...past, section]); setSection(next); setFuture(future.slice(1)); setError(''); setNotice('Действие повторено') } }
  const save = (proceed = false) => {
    if (pendingGeometry) { setError('Сначала примените или отмените правки геометрии в редакторе.'); return }
    try { const result = sectionRepository.save(section, saved.revision, persona); setSection(result); setSaved(result); setError(''); setNotice(''); onSaved(result); if (proceed) routeBlocker?.proceed?.() }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Не удалось сохранить разрез.') }
  }
  const props = { section, disabled: !editable, onChange: commit }
  const graphicReady = !profileIssues(section.profile).length && Number.isFinite(section.top) && Number.isFinite(section.bottom) && section.top > section.bottom
  const select = (id: string) => onSearch({ ...search, selection: id || undefined })
  const backup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(section, null, 2)], { type: 'application/json;charset=utf-8' })), a = document.createElement('a')
    a.href = url; a.download = `${section.id}-разрез.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const graphView = view !== 'overview'
  const documentActions = <div className="section-actions"><Button variant="quiet" size="sm" disabled={pendingGeometry} aria-label="Скачать копию разреза JSON" title="Скачать копию разреза JSON" onClick={backup}><Download size={17} /></Button><Button variant="quiet" size="sm" aria-label="Отменить действие разреза" disabled={!editable || pendingGeometry || !past.length} onClick={undo}><Undo2 size={18} /></Button><Button variant="quiet" size="sm" aria-label="Повторить действие разреза" disabled={!editable || pendingGeometry || !future.length} onClick={redo}><Redo2 size={18} /></Button><Button size="sm" disabled={!editable || !dirty} onClick={() => save()}><Save size={17} />Сохранить разрез</Button></div>
  const messages = <>{error && routeBlocker?.status !== 'blocked' && <p role="alert" className="section-error">{error}</p>}
    {stale.length > 0 && <p role="status" className="section-preview">Изменились общие вспомогательные опоры: {stale.length}. Сохранена прежняя геометрия. Откройте опоры соответствующего слоя и примените коррекцию.</p>}</>
  const deleteAction = editable && <Button variant="quiet" className="section-delete" disabled={dirty || pendingGeometry} onClick={() => {
      if (!window.confirm(`Удалить разрез «${saved.title}»?`)) return
      try { sectionRepository.remove(saved.id, saved.revision, persona); onDeleted?.() } catch (problem) { setError(problem instanceof Error ? problem.message : 'Не удалось удалить разрез.') }
    }}><Trash2 size={15} />Удалить разрез</Button>
  const editor = view === 'overview' ? <SectionSetup {...props} onPending={setPendingGeometry} onMap={()=>onSearch({...search,view:'map'})} /> : view === 'map' ? <ProfileMap documents={documents} {...props} onPending={setPendingGeometry} /> : !graphicReady ? <PlotSurface><p role="alert" className="section-error">Для графической области исправьте профиль и диапазон высот во вкладке «Разрез». Черновик сохранён в текущей рабочей области.</p></PlotSurface> : view === 'drawing' ? <DrawingEditor {...props} selection={search.selection} onSelect={select} /> : <>
        {view === 'technology' && <div className="section-actions" role="group" aria-label="Режим технологии">{(['layers', 'foundation'] as const).map((mode, i) => <Button key={mode} variant={(search.mode ?? 'layers') === mode ? 'primary' : 'secondary'} onClick={() => onSearch({ view, mode })}>{['Пропластки', 'Фундамент и разломы'][i]}</Button>)}</div>}
        {view === 'ore' && <div className="section-actions" role="group" aria-label="Источник руды">{(['corrected', 'uncorrected'] as const).map((mode, i) => <Button key={mode} variant={(search.mode ?? 'corrected') === mode ? 'primary' : 'secondary'} onClick={() => onSearch({ view, mode })}>{['В технологической толще', 'Без поправок'][i]}</Button>)}</div>}
        {view === 'lithology' || view === 'oxidation' || view === 'technology' && search.mode === 'foundation' ? <GraphicEditor key={`${view}-${search.mode}`} {...props} onPending={setPendingGeometry} mode={view === 'technology' ? search.mode as 'foundation' : view} selection={search.selection} onSelect={select} /> : <CorrelationEditor onPending={setPendingGeometry} key={`${view}-${search.mode}`} {...props} layer={view === 'ore' ? search.mode === 'uncorrected' ? 'uncorrected' : 'ore' : view === 'offbalance' ? 'offbalance' : 'technology'} selection={search.selection} onSelect={select} />}
      </>
  return <div className={`section-workbench${graphView ? ' section-workbench--graph' : ''}`}>
    <SectionDocumentHeader section={section} status={!editable ? 'readonly' : pendingGeometry ? 'pending' : dirty ? 'dirty' : 'saved'} actions={documentActions} message={notice} />
    {(error && routeBlocker?.status !== 'blocked' || stale.length > 0) && <div className="section-document-alerts">{messages}</div>}

    <div className="section-workbench__body"><WorkspaceTabs tabs={sectionViews} value={view} label="Разделы разреза" onChange={id => onSearch({ view: id as SectionView })}><div className="section-workbench__main">{graphView ? <SectionGraphicWorkspace title={sectionViews.find(v => v.id === view)?.label ?? 'Разрез'}>{editor}{deleteAction}</SectionGraphicWorkspace> : editor}
    </div></WorkspaceTabs></div>

    {!graphView && <>{deleteAction}</>}
    {routeBlocker?.status === 'blocked' && <DiscardChangesDialog error={error} onStay={() => routeBlocker.reset()} onDiscard={() => routeBlocker.proceed()} onSave={editable ? () => save(true) : undefined} />}
  </div>
}

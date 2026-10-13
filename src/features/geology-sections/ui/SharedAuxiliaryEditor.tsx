import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { GeologySection, SectionLayer, SharedAuxiliary } from '../../../entities/geology-section/model/types'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { applySharedAuxiliary, staleAuxiliary } from '../../../entities/geology-section/lib/sharedAuxiliary'
import { repairSection } from '../../../entities/geology-section/lib/repair'
import { useSession } from '../../../entities/session/model/sessionContext'
import { sharedAuxiliaryRepository } from '../../../repository/demo/sharedAuxiliaryRepository'
import { sectionRepository, validateSection } from '../../../repository/demo/sectionRepository'
import { sharedAuxiliaryQueryKey, useSharedAuxiliary } from '../model/useSharedAuxiliary'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'

type Impact = { id: string; title: string; locked: boolean; changes: string[]; error?: string }
export function SharedAuxiliaryEditor({ section, layer, disabled, onChange, onPending }: { section: GeologySection; layer: SectionLayer; disabled: boolean; onChange: (s: GeologySection) => void; onPending: (pending: boolean) => void }) {
  const { persona } = useSession(), queryClient = useQueryClient(), query = useSharedAuxiliary()
  const [draft, setDraft] = useState<SharedAuxiliary | null>(null), [impacts, setImpacts] = useState<Impact[] | null>(null)
  const [correction, setCorrection] = useState<ReturnType<typeof applySharedAuxiliary> | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('')
  useEffect(() => { onPending(!!draft); return () => onPending(false) }, [draft, onPending])
  const sources = query.data ?? [], stale = staleAuxiliary(section, sources)
  const refresh = () => queryClient.invalidateQueries({ queryKey: sharedAuxiliaryQueryKey })
  const report = (problem: unknown) => setError(problem instanceof Error ? problem.message : 'Не удалось изменить общую опору.')
  const prepare = async () => {
    if (!draft) return
    try {
      if (![draft.from, draft.to].every(Number.isFinite) || draft.from < 0 || draft.to <= draft.from || !sectionSources(section).some(w => w.id === draft.wellId)) throw new Error('Укажите скважину и положительный диапазон MD.')
      const docs = await sectionRepository.list(), result: Impact[] = []
      for (const saved of docs) {
        const doc = saved.id === section.id ? section : saved
        if (!doc.auxiliary?.some(a => a.sharedId === draft.id)) continue
        const repaired = applySharedAuxiliary(doc, [{ ...draft, revision: draft.revision + 1 }])
        let error: string | undefined
        try { validateSection(repaired.section) } catch (problem) { error = problem instanceof Error ? problem.message : 'Некорректная геометрия.' }
        result.push({ id: doc.id, title: doc.title, locked: doc.status === 'locked', changes: repaired.changes, error })
      }
      setImpacts(result); setError('')
    } catch (problem) { report(problem) }
  }
  const publish = () => {
    if (!draft) return
    try {
      if (impacts?.some(i => i.error)) throw new Error('Сначала исправьте рабочие диапазоны затронутых разрезов или отсоедините опору.')
      if (draft.id) sharedAuxiliaryRepository.update(draft, draft.revision, persona)
      else sharedAuxiliaryRepository.create(draft, persona)
      void refresh(); setDraft(null); setImpacts(null); setError(''); setNotice('Общая опора сохранена. В затронутых разрезах примените коррекцию отдельно.')
    } catch (problem) { report(problem) }
  }
  const previewCorrection = () => {
    try { const result = applySharedAuxiliary(section, sharedAuxiliaryRepository.list()); validateSection(result.section); setCorrection(result); setError('') } catch (problem) { report(problem) }
  }
  const attach = (source: SharedAuxiliary) => {
    try {
      const next = { ...section, participation: { ...section.participation, [layer]: [...new Set([...section.participation[layer], source.wellId])] }, auxiliary: [...(section.auxiliary ?? []), { id: source.id, wellId: source.wellId, layer: source.layer, from: source.from, to: source.to, sharedId: source.id, sourceRevision: source.revision }] }
      validateSection(next); onChange(next); setError(''); setNotice('Опора добавлена в черновик разреза. Сохраните разрез.')
    } catch (problem) { report(problem) }
  }
  const detach = (id: string) => {
    if (Object.values(section.links).some(links => links.some(l => l.a.endsWith(`/${id}`) || l.b.endsWith(`/${id}`)))) { setError('Опора связана: сначала разъедините её интервалы.'); return }
    onChange(repairSection({ ...section, auxiliary: section.auxiliary?.filter(a => a.id !== id) }).section); setError('')
  }
  return <details><summary>Общие вспомогательные опоры</summary><p className="section-muted">Опоры принадлежат подмодулю разрезов. Каждый разрез хранит применённую ревизию; обновление общей опоры требует явной коррекции.</p>
    <div className="section-actions"><Button variant="secondary" disabled={disabled || !!draft || query.isError} onClick={() => { const well = sectionSources(section).find(w => w.id === section.wellIds[0]) ?? sectionSources(section)[0]!; setDraft({ id: '', revision: 0, scope: 'geology-section-prototype', wellId: well.id, layer, from: well.depth, to: well.depth + 2 }); setError('') }}>Новая общая опора</Button><Button variant="quiet" onClick={() => void query.refetch()}>Обновить опоры</Button>{stale.length > 0 && <Button disabled={disabled || !!draft} onClick={previewCorrection}>Предпросмотр коррекции общих опор</Button>}</div>
    {query.isPending && <p>Открываем общие опоры…</p>}{query.error && <p role="alert" className="section-error">{query.error.message}</p>}{error && <p role="alert" className="section-error">{error}</p>}{notice && <p role="status">{notice}</p>}{stale.length > 0 && <p className="section-preview">Изменились общие опоры: {stale.length}. До применения коррекции сохраняется прежняя геометрия разреза.</p>}
    <ul>{sources.filter(s => s.layer === layer).map(source => {
      const attached = section.auxiliary?.find(a => a.sharedId === source.id)
      return <li key={source.id}>{sectionSources(section).find(w => w.id === source.wellId)?.name}: MD {source.from}–{source.to} м · рев. {source.revision}{attached && ` · применена рев. ${attached.sourceRevision}`} <Button variant="quiet" disabled={disabled || !!draft || !!attached || !section.wellIds.includes(source.wellId)} onClick={() => attach(source)}>Добавить в разрез</Button><Button variant="quiet" disabled={disabled || !!draft} onClick={() => { setDraft(structuredClone(source)); setError('') }}>Изменить общую опору</Button><Button variant="quiet" disabled={disabled || !!draft} onClick={() => { try { sharedAuxiliaryRepository.remove(source.id, source.revision, persona); void refresh(); setError('') } catch (problem) { report(problem) } }}>Удалить общую опору</Button>{attached && <Button variant="quiet" disabled={disabled || !!draft} onClick={() => detach(attached.id)}>Убрать из разреза</Button>}</li>
    })}</ul>{!sources.some(s => s.layer === layer) && !query.isPending && <p>Общих опор этого слоя пока нет.</p>}
    {(section.auxiliary ?? []).filter(a => a.layer === layer && !a.sharedId).map(a => <p key={a.id}>Локальная опора {a.id}: {a.from}–{a.to} м <Button variant="quiet" disabled={disabled || !!draft} onClick={() => detach(a.id)}>Убрать из разреза</Button></p>)}
    {draft && <fieldset><legend>{draft.id ? 'Изменение общей опоры' : 'Создание общей опоры'}</legend><div className="section-form"><label>Скважина опоры<select disabled={!!draft.id} value={draft.wellId} onChange={e => setDraft({ ...draft, wellId: e.target.value })}>{sectionSources(section).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>{(['from', 'to'] as const).map((key, i) => <label key={key}>{['От MD опоры, м', 'До MD опоры, м'][i]}<input type="number" value={Number.isFinite(draft[key]) ? draft[key] : ''} onChange={e => setDraft({ ...draft, [key]: e.target.valueAsNumber })} /></label>)}</div><div className="section-actions"><Button onClick={() => void prepare()}>Проверить затронутые разрезы</Button><Button variant="quiet" onClick={() => { setDraft(null); setImpacts(null); setError('') }}>Отменить правки опоры</Button></div></fieldset>}
    {impacts && <WorkspaceDialog title="Последствия изменения общей опоры" onClose={() => setImpacts(null)} footer={<><Button variant="secondary" onClick={() => setImpacts(null)}>Назад к опоре</Button><Button disabled={impacts.some(i => i.error)} onClick={publish}>Сохранить общую опору</Button></>}><p>Опора обновится в общем реестре. Сохранённая геометрия каждого разреза изменится только после отдельного применения и сохранения коррекции.</p>{impacts.length ? <ul>{impacts.map(i => <li key={i.id}><strong>{i.title}</strong>{i.locked && ' · зафиксирован, доступен только для просмотра'}{i.error ? <p role="alert">{i.error}</p> : i.changes.length ? <ul>{i.changes.map(c => <li key={c}>{c}</li>)}</ul> : <p>Контуры перестроятся по новым границам опоры.</p>}</li>)}</ul> : <p>Опора ещё не используется в сохранённых разрезах.</p>}{error && <p role="alert">{error}</p>}</WorkspaceDialog>}
    {correction && <WorkspaceDialog title="Коррекция общих опор разреза" onClose={() => setCorrection(null)} footer={<><Button variant="secondary" onClick={() => setCorrection(null)}>Оставить прежнюю геометрию</Button><Button onClick={() => {
      try { const current = sharedAuxiliaryRepository.list(); if (staleAuxiliary(correction.section, current).length) throw new Error('Опора снова изменилась. Закройте предпросмотр и повторите проверку.'); onChange(correction.section); setCorrection(null); setNotice('Коррекция применена к черновику одной отменяемой командой. Сохраните разрез.'); setError('') } catch (problem) { report(problem) }
    }}>Применить коррекцию в разрезе</Button></>}><p>Изменится только «{section.title}». Остальные разрезы сохранят прежние ревизии до отдельной коррекции.</p>{correction.changes.length ? <ul>{correction.changes.map(c => <li key={c}>{c}</li>)}</ul> : <p>Связи сохранятся; координаты контуров обновятся по общим опорам.</p>}{error && <p role="alert">{error}</p>}</WorkspaceDialog>}
  </details>
}

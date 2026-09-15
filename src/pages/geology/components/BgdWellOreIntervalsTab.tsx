import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Layers3, Link2, Plus, Save, Scissors, Trash2, Unlink2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DifferentialOreInterval, OreElement, OreInterval, OreIntervalDraft, OreIntervalSource, OrePermeability, OreValueBasis, WellOreWorkspace } from '../../../entities/well-ore/model/types'
import type { Well } from '../../../entities/well/model/types'
import { areContinuousDifferentials, canMergeOreGroups, createOreInterval, detachFromOreGroup, mergeOreGroups, mergedSummaries, oreThickness, splitOreGroup, validateOreInterval } from '../../../features/geobase/model/bgdWellOreIntervals'
import { fetchWellOreWorkspace, saveWellOreWorkspace } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const sources: OreIntervalSource[] = ['Гамма-каротаж', 'КНД', 'Керн и опробование', 'Паспортная информация']
const elements: OreElement[] = ['Уран', 'Радий']
const permeabilityOptions: OrePermeability[] = ['Проницаемый', 'Непроницаемый']
type View = 'differential' | 'ore' | 'merged'

const display = (value: number, digits = 4) => value.toLocaleString('ru-RU', { maximumFractionDigits: digits })
const defaultDraft = (source: OreIntervalSource, element: OreElement, from: number): OreIntervalDraft => ({ source, element, from, to: Number((from + .1).toFixed(2)), basis: 'content', value: .01, permeability: 'Непроницаемый' })

export function BgdWellOreIntervalsTab({ well, canManageAll, canManageGeophysics }: { well: Well; canManageAll: boolean; canManageGeophysics: boolean }) {
  const query = useQuery({ queryKey: ['well-ore', well.id], queryFn: () => fetchWellOreWorkspace(well.id) })
  if (query.isError) return <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>Не удалось загрузить рудные интервалы: {query.error.message}</span></div>
  if (query.isLoading || !query.data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем рудные интервалы…</p></div>
  return <OreWorkspaceEditor key={well.id} well={well} initial={query.data} canManageAll={canManageAll} canManageGeophysics={canManageGeophysics} />
}

function OreWorkspaceEditor({ well, initial, canManageAll, canManageGeophysics }: { well: Well; initial: WellOreWorkspace; canManageAll: boolean; canManageGeophysics: boolean }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(initial)
  const [view, setView] = useState<View>('ore')
  const [selectedOreId, setSelectedOreId] = useState(initial.oreIntervals[0]?.id ?? '')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState(initial.mergedIntervals[0]?.id ?? '')
  const [selectedGroupChildId, setSelectedGroupChildId] = useState('')
  const [selectedDiffIds, setSelectedDiffIds] = useState<string[]>([])
  const [selectedDiffId, setSelectedDiffId] = useState(initial.differentialIntervals[0]?.id ?? '')
  const [oreForm, setOreForm] = useState(() => defaultDraft(initial.selectedSource, initial.selectedElement, initial.oreIntervals.at(-1)?.to ?? 0))
  const [diffForm, setDiffForm] = useState(() => ({ from: initial.differentialIntervals.at(-1)?.to ?? 0, to: Number(((initial.differentialIntervals.at(-1)?.to ?? 0) + .1).toFixed(2)), content: .01, permeability: 'Непроницаемый' as OrePermeability }))
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const selectedSourceCanEdit = canManageAll || (canManageGeophysics && (draft.selectedSource === 'Гамма-каротаж' || draft.selectedSource === 'КНД'))
  const changed = JSON.stringify(draft) !== JSON.stringify(initial)
  const visibleOre = useMemo(() => draft.oreIntervals.filter((item) => item.source === draft.selectedSource && item.element === draft.selectedElement).sort((a, b) => a.from - b.from), [draft])
  const visibleGroups = useMemo(() => mergedSummaries(draft).filter((item) => item.source === draft.selectedSource && item.element === draft.selectedElement), [draft])
  const visibleDiff = useMemo(() => draft.differentialIntervals.filter((item) => item.source === draft.selectedSource && item.element === draft.selectedElement).sort((a, b) => a.from - b.from), [draft])
  const selectedOre = draft.oreIntervals.find((item) => item.id === selectedOreId)
  const selectedGroup = visibleGroups.find((item) => item.id === selectedGroupId)
  const selectedDiff = draft.differentialIntervals.find((item) => item.id === selectedDiffId)

  const mutation = useMutation({
    mutationFn: () => saveWellOreWorkspace(well.id, initial, draft, 'geology.bgd.ore.saved'),
    onSuccess: (value) => { queryClient.setQueryData(['well-ore', well.id], value); setDraft(value); setSaved(true) },
  })

  const updateContext = (patch: Partial<Pick<WellOreWorkspace, 'selectedSource' | 'selectedElement' | 'useDifferentialLogging'>>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setSelectedOreId('')
    setSelectedGroupIds([])
    setSelectedGroupId('')
    setSelectedDiffIds([])
    setSelectedDiffId('')
    setOreForm(defaultDraft(next.selectedSource, next.selectedElement, next.oreIntervals.filter((item) => item.source === next.selectedSource && item.element === next.selectedElement).at(-1)?.to ?? 0))
    if (patch.useDifferentialLogging === false && view === 'differential') setView('ore')
  }
  const editOre = (item: OreInterval) => {
    setSelectedOreId(item.id)
    setOreForm({ source: item.source, element: item.element, from: item.from, to: item.to, basis: 'content', value: item.content, permeability: item.permeability })
    setErrors([])
  }
  const submitOre = () => {
    const id = selectedOre?.id ?? `ORE-${well.id}-U${draft.oreIntervals.length + 1}`
    const next = createOreInterval(id, oreForm, selectedOre?.differentialIds ?? [])
    const validation = validateOreInterval(next, draft, selectedOre?.id)
    if (next.to > well.depth) validation.push(`Конечная глубина не может превышать глубину скважины ${display(well.depth, 2)} м.`)
    if (validation.length) return setErrors(validation)
    const oreIntervals = selectedOre ? draft.oreIntervals.map((item) => item.id === selectedOre.id ? next : item) : [...draft.oreIntervals, next]
    const mergedIntervals = selectedOre ? draft.mergedIntervals : [...draft.mergedIntervals, { id: `ORI-${well.id}-U${draft.mergedIntervals.length + 1}`, oreIntervalIds: [id] }]
    setDraft({ ...draft, oreIntervals, mergedIntervals })
    setSelectedOreId(id)
    setErrors([])
  }
  const removeOre = () => {
    if (!selectedOre || !selectedSourceCanEdit) return
    setDraft({ ...draft, oreIntervals: draft.oreIntervals.filter((item) => item.id !== selectedOre.id), mergedIntervals: draft.mergedIntervals.map((item) => ({ ...item, oreIntervalIds: item.oreIntervalIds.filter((id) => id !== selectedOre.id) })).filter((item) => item.oreIntervalIds.length), differentialIntervals: draft.differentialIntervals.map((item) => item.oreIntervalId === selectedOre.id ? { ...item, oreIntervalId: undefined } : item) })
    setSelectedOreId('')
  }
  const submitDiff = () => {
    const item: DifferentialOreInterval = { id: selectedDiff?.id ?? `DIFF-${well.id}-U${draft.differentialIntervals.length + 1}`, source: draft.selectedSource, element: draft.selectedElement, ...diffForm, oreIntervalId: selectedDiff?.oreIntervalId }
    const overlap = draft.differentialIntervals.find((candidate) => candidate.id !== selectedDiff?.id && candidate.source === item.source && candidate.element === item.element && item.from < candidate.to && item.to > candidate.from)
    const validation = item.to <= item.from ? ['Конечная глубина должна быть больше начальной.'] : item.to > well.depth ? [`Глубина не может превышать ${display(well.depth, 2)} м.`] : overlap ? [`Интервал пересекается с ${display(overlap.from)}–${display(overlap.to)} м.`] : []
    if (validation.length) return setErrors(validation)
    setDraft({ ...draft, differentialIntervals: selectedDiff ? draft.differentialIntervals.map((candidate) => candidate.id === selectedDiff.id ? item : candidate) : [...draft.differentialIntervals, item] })
    setSelectedDiffId(item.id)
    setErrors([])
  }
  const combineDifferentials = () => {
    if (!areContinuousDifferentials(selectedDiffIds, draft) || !selectedSourceCanEdit) return setErrors(['Выберите непрерывную последовательность свободных дифференциальных интервалов.'])
    const members = draft.differentialIntervals.filter((item) => selectedDiffIds.includes(item.id)).sort((a, b) => a.from - b.from)
    const firstMember = members[0]!
    const thickness = members.reduce((sum, item) => sum + item.to - item.from, 0)
    const meterPercent = members.reduce((sum, item) => sum + item.content * (item.to - item.from), 0)
    const permeableThickness = members.filter((item) => item.permeability === 'Проницаемый').reduce((sum, item) => sum + item.to - item.from, 0)
    const oreId = `ORE-${well.id}-D${draft.oreIntervals.length + 1}`
    const ore = createOreInterval(oreId, { source: draft.selectedSource, element: draft.selectedElement, from: firstMember.from, to: members.at(-1)!.to, basis: 'meterPercent', value: Number(meterPercent.toFixed(4)), permeability: permeableThickness > thickness / 2 ? 'Проницаемый' : 'Непроницаемый' }, members.map((item) => item.id))
    setDraft({ ...draft, oreIntervals: [...draft.oreIntervals, ore], mergedIntervals: [...draft.mergedIntervals, { id: `ORI-${well.id}-D${draft.mergedIntervals.length + 1}`, oreIntervalIds: [oreId] }], differentialIntervals: draft.differentialIntervals.map((item) => selectedDiffIds.includes(item.id) ? { ...item, oreIntervalId: oreId } : item) })
    setSelectedDiffIds([])
    setSelectedOreId(oreId)
    setErrors([])
  }

  return <div className="bgd-well-stack bgd-ore-workspace" data-geology-tour="bgd-well-ore-intervals">
    {saved && <div className="success-banner"><Check size={17} /><span><strong>Рудные интервалы сохранены</strong>Создана новая локальная demo-версия.</span><button type="button" onClick={() => setSaved(false)}>Закрыть</button></div>}
    <Panel title="Контекст выделения" description="Интервалы разных источников и элементов ведутся раздельно">
      <div className="bgd-ore-context">
        <label className="field"><span className="field__label">Источник выделения <em>*</em></span><select required aria-label="Источник выделения" value={draft.selectedSource} onChange={(event) => updateContext({ selectedSource: event.target.value as OreIntervalSource })}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span className="field__label">Элемент <em>*</em></span><select required aria-label="Элемент" value={draft.selectedElement} onChange={(event) => updateContext({ selectedElement: event.target.value as OreElement })}>{elements.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="bgd-ore-differential-check"><input type="checkbox" checked={draft.useDifferentialLogging} disabled={!selectedSourceCanEdit} onChange={(event) => updateContext({ useDifferentialLogging: event.target.checked })} /><span><strong>Использовать дифференциальный каротаж</strong><small>Добавляет исходные дифференциальные интервалы в рабочий процесс</small></span></label>
      </div>
    </Panel>
    {!selectedSourceCanEdit && <div className="form-alert"><Layers3 size={17} /><span>Источник «{draft.selectedSource}» доступен только для просмотра с текущими правами.</span></div>}
    <div className="bgd-ore-tabs" role="tablist" aria-label="Разделы рудных интервалов">
      {draft.useDifferentialLogging && <button type="button" role="tab" aria-selected={view === 'differential'} className={view === 'differential' ? 'is-active' : ''} onClick={() => setView('differential')}>Дифференциальный каротаж <Badge tone="neutral">{visibleDiff.length}</Badge></button>}
      <button type="button" role="tab" aria-selected={view === 'ore'} className={view === 'ore' ? 'is-active' : ''} onClick={() => setView('ore')}>Рудные интервалы <Badge tone="info">{visibleOre.length}</Badge></button>
      <button type="button" role="tab" aria-selected={view === 'merged'} className={view === 'merged' ? 'is-active' : ''} onClick={() => setView('merged')}>Рудные объединения <Badge tone="warning">{visibleGroups.length}</Badge></button>
    </div>

    {view === 'ore' && <div className="bgd-ore-layout">
      <Panel title="Список рудных интервалов" description={`${draft.selectedSource} · ${draft.selectedElement}`}><OreTable rows={visibleOre} selectedId={selectedOreId} onSelect={editOre} /></Panel>
      <Panel title={selectedOre ? 'Изменение интервала' : 'Новый рудный интервал'} description="Обязательные поля отмечены звёздочкой">
        <div className="bgd-ore-form">
          <label className="field"><span className="field__label">Источник выделения <em>*</em></span><select required value={oreForm.source} onChange={(event) => updateContext({ selectedSource: event.target.value as OreIntervalSource })}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field"><span className="field__label">Элемент <em>*</em></span><select required value={oreForm.element} onChange={(event) => updateContext({ selectedElement: event.target.value as OreElement })}>{elements.map((item) => <option key={item}>{item}</option>)}</select></label>
          <NumberField label="Начальная глубина, м *" value={oreForm.from} disabled={!selectedSourceCanEdit} onChange={(from) => setOreForm({ ...oreForm, from })} />
          <NumberField label="Конечная глубина, м *" value={oreForm.to} disabled={!selectedSourceCanEdit} onChange={(to) => setOreForm({ ...oreForm, to })} />
          <label className="field"><span className="field__label">Мощность, м</span><input disabled value={display(oreForm.to - oreForm.from, 2)} /></label>
          <label className="field"><span className="field__label">Основа расчёта</span><select disabled={!selectedSourceCanEdit} value={oreForm.basis} onChange={(event) => setOreForm({ ...oreForm, basis: event.target.value as OreValueBasis })}><option value="content">Содержание, %</option><option value="meterPercent">Метропроцент, м%</option></select></label>
          <NumberField label={oreForm.basis === 'content' ? 'Содержание, % *' : 'Метропроцент, м% *'} value={oreForm.value} disabled={!selectedSourceCanEdit} onChange={(value) => setOreForm({ ...oreForm, value })} step="0.0001" />
          <label className="field"><span className="field__label">Тип проницаемости <em>*</em></span><select disabled={!selectedSourceCanEdit} value={oreForm.permeability} onChange={(event) => setOreForm({ ...oreForm, permeability: event.target.value as OrePermeability })}>{permeabilityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <p className="bgd-ore-demo-note">Demo-расчёт: метропроцент = содержание × мощность; обратный показатель рассчитывается автоматически.</p>
        <div className="bgd-ore-actions"><Button disabled={!selectedSourceCanEdit} onClick={submitOre}><Plus size={14} /> {selectedOre ? 'Применить' : 'Добавить'}</Button>{selectedOre && <Button variant="secondary" onClick={() => { setSelectedOreId(''); setOreForm(defaultDraft(draft.selectedSource, draft.selectedElement, selectedOre.to)) }}>Новый</Button>}{selectedOre && <Button variant="quiet" disabled={!selectedSourceCanEdit} onClick={removeOre}><Trash2 size={14} /> Удалить</Button>}</div>
      </Panel>
    </div>}

    {view === 'merged' && <div className="bgd-ore-layout bgd-ore-layout--merged">
      <Panel title="Объединённые рудные интервалы" description="Параметры рассчитываются по дочерним интервалам"><div className="bgd-ore-table bgd-ore-table--merged" role="table"><div className="bgd-ore-table__head" role="row"><span /><span>Источник / элемент</span><span>Интервал</span><span>Мощн., м</span><span>Сод., %</span><span>м%</span><span>Тип</span></div>{visibleGroups.map((item) => <button type="button" role="row" key={item.id} className={selectedGroupId === item.id ? 'is-selected' : ''} onClick={() => { setSelectedGroupId(item.id); setSelectedGroupChildId(item.oreIntervalIds[0] ?? '') }}><span role="cell"><input aria-label={`Выбрать ${item.id}`} type="checkbox" checked={selectedGroupIds.includes(item.id)} onClick={(event) => event.stopPropagation()} onChange={() => setSelectedGroupIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} /></span><span role="cell"><strong>{item.source}</strong><small>{item.element} · {item.id}</small></span><span role="cell">{display(item.from)}–{display(item.to)}</span><span role="cell">{display(item.thickness, 2)}</span><span role="cell">{display(item.content)}</span><span role="cell">{display(item.meterPercent)}</span><span role="cell">{item.permeability}</span></button>)}</div><div className="bgd-ore-actions"><Button disabled={!selectedSourceCanEdit || !canMergeOreGroups(selectedGroupIds, draft)} onClick={() => { const next = mergeOreGroups(selectedGroupIds, draft); setDraft(next); setSelectedGroupIds([]) }}><Link2 size={14} /> Объединить выбранные</Button><Button variant="secondary" disabled={!selectedSourceCanEdit || !selectedGroup || selectedGroup.oreIntervalIds.length < 2} onClick={() => selectedGroup && setDraft(splitOreGroup(selectedGroup.id, draft))}><Scissors size={14} /> Разъединить</Button></div></Panel>
      <Panel title="Интервалы в объединении" description={selectedGroup ? `${selectedGroup.id} · выберите границу отсоединения` : 'Выберите объединение'}>{selectedGroup ? <><div className="bgd-ore-members">{selectedGroup.oreIntervalIds.map((id) => draft.oreIntervals.find((item) => item.id === id)).filter((item): item is OreInterval => Boolean(item)).map((item) => <button type="button" key={item.id} className={selectedGroupChildId === item.id ? 'is-selected' : ''} onClick={() => setSelectedGroupChildId(item.id)}><span><strong>{display(item.from)}–{display(item.to)} м</strong><small>{item.source} · {item.element}</small></span><Badge tone={item.permeability === 'Проницаемый' ? 'success' : 'neutral'}>{item.permeability}</Badge></button>)}</div><div className="bgd-ore-actions"><Button variant="secondary" disabled={!selectedSourceCanEdit || selectedGroup.oreIntervalIds.length < 2 || !selectedGroupChildId} onClick={() => setDraft(detachFromOreGroup(selectedGroup.id, selectedGroupChildId, 'top', draft))}><Unlink2 size={14} /> Отсоединить верхние</Button><Button variant="secondary" disabled={!selectedSourceCanEdit || selectedGroup.oreIntervalIds.length < 2 || !selectedGroupChildId} onClick={() => setDraft(detachFromOreGroup(selectedGroup.id, selectedGroupChildId, 'bottom', draft))}><Unlink2 size={14} /> Отсоединить нижние</Button></div></> : <div className="geobase-empty"><Layers3 size={18} /><strong>Объединение не выбрано</strong><span>Выберите строку слева.</span></div>}</Panel>
    </div>}

    {view === 'differential' && <div className="bgd-ore-layout">
      <Panel title="Дифференциальные интервалы" description="Белый — свободный; жёлтый — выбранное рудное выделение; серый — другое"><div className="bgd-ore-table bgd-ore-table--differential" role="table"><div className="bgd-ore-table__head" role="row"><span /><span>Источник / элемент</span><span>Интервал</span><span>Мощн., м</span><span>Сод., %</span><span>Тип</span><span>Связь</span></div>{visibleDiff.map((item) => { const status = !item.oreIntervalId ? 'free' : item.oreIntervalId === selectedOreId ? 'selected-member' : 'other-member'; return <button type="button" role="row" key={item.id} className={`is-${status} ${selectedDiffId === item.id ? 'is-selected' : ''}`} onClick={() => { setSelectedDiffId(item.id); setDiffForm({ from: item.from, to: item.to, content: item.content, permeability: item.permeability }) }}><span role="cell"><input aria-label={`Выбрать ${item.id}`} type="checkbox" disabled={Boolean(item.oreIntervalId)} checked={selectedDiffIds.includes(item.id)} onClick={(event) => event.stopPropagation()} onChange={() => setSelectedDiffIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} /></span><span role="cell"><strong>{item.source}</strong><small>{item.element}</small></span><span role="cell">{display(item.from)}–{display(item.to)}</span><span role="cell">{display(item.to - item.from, 2)}</span><span role="cell">{display(item.content)}</span><span role="cell">{item.permeability}</span><span role="cell"><Badge tone={status === 'free' ? 'success' : status === 'selected-member' ? 'warning' : 'neutral'}>{status === 'free' ? 'Свободен' : item.oreIntervalId}</Badge></span></button>})}</div><div className="bgd-ore-actions"><Button disabled={!selectedSourceCanEdit || !areContinuousDifferentials(selectedDiffIds, draft)} onClick={combineDifferentials}><Link2 size={14} /> Создать рудный интервал</Button></div></Panel>
      <Panel title={selectedDiff ? 'Изменение дифференциального интервала' : 'Новый дифференциальный интервал'} description={`${draft.selectedSource} · ${draft.selectedElement}`}><div className="bgd-ore-form"><label className="field"><span className="field__label">Источник выделения <em>*</em></span><input disabled value={draft.selectedSource} /></label><label className="field"><span className="field__label">Элемент <em>*</em></span><input disabled value={draft.selectedElement} /></label><NumberField label="Начальная глубина, м *" value={diffForm.from} disabled={!selectedSourceCanEdit || Boolean(selectedDiff?.oreIntervalId)} onChange={(from) => setDiffForm({ ...diffForm, from })} /><NumberField label="Конечная глубина, м *" value={diffForm.to} disabled={!selectedSourceCanEdit || Boolean(selectedDiff?.oreIntervalId)} onChange={(to) => setDiffForm({ ...diffForm, to })} /><NumberField label="Содержание, % *" value={diffForm.content} step="0.0001" disabled={!selectedSourceCanEdit || Boolean(selectedDiff?.oreIntervalId)} onChange={(content) => setDiffForm({ ...diffForm, content })} /><label className="field"><span className="field__label">Тип проницаемости <em>*</em></span><select disabled={!selectedSourceCanEdit || Boolean(selectedDiff?.oreIntervalId)} value={diffForm.permeability} onChange={(event) => setDiffForm({ ...diffForm, permeability: event.target.value as OrePermeability })}>{permeabilityOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div>{selectedDiff?.oreIntervalId && <p className="bgd-ore-demo-note">Связанный интервал редактируется через его рудное выделение.</p>}<div className="bgd-ore-actions"><Button disabled={!selectedSourceCanEdit || Boolean(selectedDiff?.oreIntervalId)} onClick={submitDiff}><Plus size={14} /> {selectedDiff ? 'Применить' : 'Добавить'}</Button>{selectedDiff && <Button variant="secondary" onClick={() => { setSelectedDiffId(''); setDiffForm({ from: selectedDiff.to, to: Number((selectedDiff.to + .1).toFixed(2)), content: .01, permeability: 'Непроницаемый' }) }}>Новый</Button>}{selectedDiff && <Button variant="quiet" disabled={!selectedSourceCanEdit || Boolean(selectedDiff.oreIntervalId)} onClick={() => { setDraft({ ...draft, differentialIntervals: draft.differentialIntervals.filter((item) => item.id !== selectedDiff.id) }); setSelectedDiffId('') }}><Trash2 size={14} /> Удалить</Button>}</div></Panel>
    </div>}

    {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span><strong>Проверьте интервалы</strong>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
    <div className="bgd-lithology-savebar"><span><strong>{changed ? 'Изменения готовы к сохранению' : `Локальная версия ${draft.version}`}</strong><small>Данные synthetic и сохраняются только в браузере прототипа.</small></span><Button disabled={!changed || mutation.isPending || (!canManageAll && !canManageGeophysics)} onClick={() => mutation.mutate()}><Save size={15} /> {mutation.isPending ? 'Сохраняем…' : 'Сохранить черновик'}</Button></div>
    {mutation.error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{mutation.error.message}</span></div>}
  </div>
}

function OreTable({ rows, selectedId, onSelect }: { rows: OreInterval[]; selectedId: string; onSelect: (item: OreInterval) => void }) {
  return <div className="bgd-ore-table" role="table" aria-label="Рудные интервалы"><div className="bgd-ore-table__head" role="row"><span>Источник / элемент</span><span>Интервал</span><span>Мощн., м</span><span>Сод., %</span><span>м%</span><span>Тип</span></div>{rows.map((item) => <button type="button" role="row" key={item.id} className={selectedId === item.id ? 'is-selected' : ''} onClick={() => onSelect(item)}><span role="cell"><strong>{item.source}</strong><small>{item.element} · {item.id}</small></span><span role="cell">{display(item.from)}–{display(item.to)}</span><span role="cell">{display(oreThickness(item), 2)}</span><span role="cell">{display(item.content)}</span><span role="cell">{display(item.meterPercent)}</span><span role="cell">{item.permeability}</span></button>)}{!rows.length && <div className="geobase-empty"><Layers3 size={18} /><strong>Интервалов нет</strong><span>Добавьте первое выделение для выбранного источника.</span></div>}</div>
}

function NumberField({ label, value, disabled, step = '0.01', onChange }: { label: string; value: number; disabled: boolean; step?: string; onChange: (value: number) => void }) {
  return <label className="field"><span className="field__label">{label}</span><input required type="number" step={step} disabled={disabled} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

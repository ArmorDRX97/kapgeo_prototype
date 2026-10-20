import { geoBlocks, techBlocks } from '../../features/geology-sections/model/blockOptions'
import { Map, Layers3, FileText, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../entities/session/model/sessionContext'
import { createSection } from '../../entities/geology-section/model/fixtures'
import { sectionRepository } from '../../repository/demo/sectionRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { SectionWorkbench } from '../../features/geology-sections/SectionWorkbench'
import { SectionRegistry } from '../../features/geology-sections/ui/SectionRegistry'
import { validateSectionSearch, type SectionSearch } from '../../features/geology-sections/model/search'
import { sectionRegistryEntries } from '../../features/geology-sections/model/registryEntries'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { GeologyModuleLayout } from './GeologyModuleLayout'
import '../../features/geology-sections/sections.css'

export function SectionsPage() {
  const { persona } = useSession(), navigate = useNavigate(), queryClient = useQueryClient()
  const { sectionId } = useParams({ strict: false }), search = validateSectionSearch(useSearch({ strict: false }))
  const query = useQuery({ queryKey: ['geology-sections-prototype'], queryFn: () => sectionRepository.demoList(), retry: false })
  const [collapsed, setCollapsed] = useState(false)
  const registryContext = { geoBlock: search.geoBlock, techBlock: search.techBlock, sortBy: search.sortBy, sortDirection: search.sortDirection, q: search.q, kind: search.kind, stage: search.stage, year: search.year, body: search.body, groupBy: search.groupBy }
  const updateRegistry = (patch: Partial<SectionSearch>, replace = false) => { const next = { ...search, ...patch }; if (sectionId) void navigate({ to: '/geology/sections/$sectionId', params: { sectionId }, search: next, replace, resetScroll: false }); else void navigate({ to: '/geology/sections', search: next, replace, resetScroll: false }) }
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [error, setError] = useState('')
  const [geoBlock, setGeoBlock] = useState(''), [techBlock, setTechBlock] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-sections-prototype'] })
  const entries = useMemo(() => sectionRegistryEntries(query.data ?? []), [query.data])
  const selectedEntry = entries.find(entry => entry.id === sectionId)
  const selected = query.data?.find(d => d.id === selectedEntry?.documentId)
  const create = () => {
    try {
      let n = 1; while (query.data?.some(s => s.id === `GTR-NEW-${n}`)) n++
      const draft = createSection(`GTR-NEW-${n}`, name)
      const doc = sectionRepository.create({...draft, metadata: {depositBody:'',createdOn:new Date().toISOString().slice(0,10),compiledBy:'',checkedBy:'',...draft.metadata,geoBlock,techBlock}}, persona)
      void refresh(); setCreating(false); setName(''); setError(''); void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: doc.id }, search: {} })
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Не удалось создать разрез.') }
  }
  return <GeologyModuleLayout>
    {query.isPending ? <div className="page-loading"><p>Открываем локальные разрезы…</p></div> : query.error ? <Panel title="Не удалось открыть реестр"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel> : <div className={`section-layout${collapsed ? ' is-registry-collapsed' : ''}`}>
      <SectionRegistry sections={entries} sectionId={sectionId} search={search} onSearch={updateRegistry} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onCreate={hasPermission(persona, 'geology.sections.edit') ? () => { setCreating(true); setError('') } : undefined} />
      <div className="section-document">{selected ? <SectionWorkbench documents={query.data} key={selected.id} initial={selected} persona={persona} search={search} onSearch={next => void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: selectedEntry!.id }, search: { ...registryContext, ...next }, resetScroll: false })} onSaved={() => void refresh()} onDeleted={() => { void refresh(); void navigate({ to: '/geology/sections' }) }} /> : <section className="section-document-empty" aria-labelledby="section-empty-title"><div><span className="section-document-empty__icon"><Layers3 size={28} /></span><h1 id="section-empty-title">{sectionId ? 'Разрез не найден' : 'Разрезы и развертки'}</h1><p>{sectionId ? 'Выберите другой разрез в реестре или создайте новый документ.' : 'Откройте разрез слева, чтобы работать с профилем, геологическими слоями и чертежом.'}</p><div className="section-document-empty__steps">{[{ icon: Map, title: 'Карта', hint: 'Сегменты и скважины' }, { icon: Layers3, title: 'Геологические данные', hint: 'Границы, интервалы и зоны' }, { icon: FileText, title: 'Чертёж', hint: 'Компоновка и печать' }].map(({ icon: StepIcon, title, hint }) => <div key={title}><StepIcon size={20} /><strong>{title}</strong><small>{hint}</small></div>)}</div>{hasPermission(persona, 'geology.sections.edit') && <Button onClick={() => { setCreating(true); setError('') }}><Plus size={16} />Создать разрез</Button>}</div></section>}</div>
    </div>}
    {creating && <WorkspaceDialog title="Новый разрез" size="compact" onClose={() => setCreating(false)} footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Отмена</Button><Button disabled={!name.trim()} onClick={create}>Создать разрез</Button></>}><div className="section-create-fields"><label className="section-search">Название разреза<input placeholder="Например, Северный · профиль 03" autoComplete="off" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>{(['geoBlock','techBlock'] as const).map((key,i)=><label className="section-search" key={key}>{i?'Технологический блок':'Геологический блок'}<select value={i?techBlock:geoBlock} onChange={e=>(i?setTechBlock:setGeoBlock)(e.target.value)}><option value="">Не выбран</option>{(i?techBlocks:geoBlocks).map(value=><option key={value}>{value}</option>)}</select></label>)}</div><p className="section-muted">Месторождение: Полигон Северный. После создания задайте высоты, состав скважин и профиль.</p>{error && <p role="alert" className="section-error">{error}</p>}</WorkspaceDialog>}
  </GeologyModuleLayout>
}

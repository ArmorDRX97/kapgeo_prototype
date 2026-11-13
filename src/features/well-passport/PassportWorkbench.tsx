import { ChevronLeft, ChevronRight, FileText, Maximize, PanelLeftClose, PanelLeftOpen, Search, UnfoldHorizontal, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { cellText, download, excelDocument, rasterSheet, serializeSheet } from './documentActions'
import { ExportDialog, TemplateDialog, TrackDialog, WellDetailsDialog, type ExportFormat } from './PassportDialogs'
import { PassportSettingsPanel } from './PassportSettingsPanel'
import { PassportInspector } from './PassportInspector'
import { PassportIconButton as IconButton, PassportToolbar } from './PassportToolbar'
import { PassportSheet, SHEET_HEIGHT, SHEET_WIDTH } from './PassportSheet'
import { loadSettings, number, PASSPORT_STORAGE_PREFIX, passportPages, passportWells, templates, type PassportSettings, type PassportWell, type TemplateId, type TrackId } from './model'
import './passport.css'

type RegistryState = { query: string; filter: TemplateId | 'all' }
function WellRegistry({ well, onSelect, onClose, state, onState }: { well: PassportWell; onSelect: (id: string) => void; onClose: () => void; state: RegistryState; onState: (state: RegistryState) => void }) {
  const { query, filter } = state
  const setQuery = (query: string) => onState({ ...state, query }), setFilter = (filter: TemplateId | 'all') => onState({ ...state, filter })
  const filtered = passportWells.filter(w => `${w.name} ${w.purpose} ${w.block}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')) && (filter === 'all' || w.kind === filter))
  return <>
    <div className="passport-pane-heading"><h2>Скважины <span>{passportWells.length}</span></h2><IconButton label="Скрыть список скважин" onClick={onClose}><PanelLeftClose size={17} /></IconButton></div>
    <div className="passport-registry-search"><Search size={16} /><input aria-label="Поиск скважины в паспортах" placeholder="Номер, назначение, блок" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" aria-label="Очистить поиск скважин" onClick={() => setQuery('')}><X size={14} /></button>}</div>
    <div className="passport-registry-filters" role="group" aria-label="Тип скважин">{(['all', 'core', 'open', 'hydro'] as const).map(id => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{{ all: 'Все', core: 'С керном', open: 'Без керна', hydro: 'Гидро' }[id]}</button>)}</div>
    <div className="passport-registry-count" role="status">{filtered.length === passportWells.length ? 'Инкай · Участок № 2' : `Найдено ${filtered.length} из ${passportWells.length}`}</div>
    <div className="passport-well-list">{templates.map(t => { const wells = filtered.filter(w => w.kind === t.id); return wells.length ? <section key={t.id} aria-label={t.name}><h3>{{ core: 'Разведочные', open: 'Эксплуатационные', hydro: 'Гидрогеологические' }[t.id]}<span>{wells.length}</span></h3>{wells.map(w => <button key={w.id} type="button" aria-current={w.id === well.id ? 'page' : undefined} onClick={() => onSelect(w.id)}><span className="passport-well-symbol" data-kind={w.kind} aria-hidden="true">⊕</span><span><strong>{w.name}</strong><small>{w.purpose} · блок {w.block}</small></span><span className="passport-well-depth">{number(w.depth)} м{w.id === well.id && <i aria-hidden="true" />}</span></button>)}</section> : null })}{!filtered.length && <div className="passport-registry-empty"><Search size={25} /><strong>Скважины не найдены</strong><p>Измените запрос или тип скважин.</p><Button size="sm" variant="secondary" onClick={() => onState({ query: '', filter: 'all' })}>Сбросить поиск</Button></div>}</div>
    <div className="passport-registry-footer"><FileText size={16} /><span>Выберите скважину для просмотра и оформления паспорта</span></div>
  </>
}
type Dialog = 'template' | 'export' | 'info' | 'help' | TrackId | null
export function PassportWorkbench({ well, onSelect, sampling = false }: { well: PassportWell; onSelect: (id: string) => void; sampling?: boolean }) {
  const [registryOpen, setRegistryOpen] = useState(() => window.innerWidth >= 1180), [settingsOpen, setSettingsOpen] = useState(() => window.innerWidth >= 900)
  const [registryState, setRegistryState] = useState<RegistryState>({ query: '', filter: 'all' })
  return <PassportDocument sampling={sampling} key={well.id} well={well} onSelect={onSelect} registryOpen={registryOpen} setRegistryOpen={setRegistryOpen} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} registryState={registryState} onRegistryState={setRegistryState} />
}
function PassportDocument({ well, onSelect, registryOpen, setRegistryOpen, settingsOpen, setSettingsOpen, registryState, onRegistryState, sampling }: {
  sampling: boolean; well: PassportWell; onSelect: (id: string) => void; registryOpen: boolean; setRegistryOpen: Dispatch<SetStateAction<boolean>>; settingsOpen: boolean; setSettingsOpen: Dispatch<SetStateAction<boolean>>; registryState: RegistryState; onRegistryState: (state: RegistryState) => void
}) {
  const [settings, setSettings] = useState(() => loadSettings(well, sampling))
  const [dialog, setDialog] = useState<Dialog>(null), [pageIndex, setPageIndex] = useState(0), [zoom, setZoom] = useState<number | 'width' | 'page'>('width'), [viewport, setViewport] = useState({ width: 800, height: 650 }), [storageError, setStorageError] = useState(''), [message, setMessage] = useState('')
  const stage = useRef<HTMLDivElement>(null), paper = useRef<HTMLDivElement>(null)
  const pages = passportPages(settings), page = pages[pageIndex] ?? pages[0]!
  const sheetWidth = sampling ? SHEET_WIDTH + 250 : SHEET_WIDTH
  const paperWidth = Math.max(240, zoom === 'width' ? viewport.width - 48 : zoom === 'page' ? Math.min(viewport.width - 48, (viewport.height - 48) * sheetWidth / SHEET_HEIGHT) : sheetWidth * zoom / 100)
  const zoomPercent = Math.round(paperWidth / sheetWidth * 100)
  const patch = (values: Partial<PassportSettings>) => {
    const next = { ...settings, ...values }; setSettings(next); setPageIndex(0); setMessage('')
    try { localStorage.setItem(PASSPORT_STORAGE_PREFIX + well.id + (sampling ? '.sampling' : ''), JSON.stringify(next)); setStorageError('') } catch { setStorageError('Оформление изменено, но не сохранено. Проверьте, доступно ли хранилище браузера.') }
  }
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => { if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }) })
    observer.observe(el); return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4500); return () => clearTimeout(timer)
  }, [message])
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return; if (window.innerWidth < 900) setSettingsOpen(false); if (window.innerWidth < 1180) setRegistryOpen(false) }
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape)
  }, [setRegistryOpen, setSettingsOpen])
  const print = () => { requestAnimationFrame(() => requestAnimationFrame(() => window.print())) }
  const exportDocument = async (format: ExportFormat) => {
    if (format === 'pdf') { print(); return }
    const filename = `${well.name}-паспорт-${pageIndex + 1}`
    if (format === 'xls') download(excelDocument(well, settings, sampling), `${well.name}-паспорт.xls`)
    else {
      const svg = paper.current?.querySelector('svg')
      if (!svg) throw new Error('Лист ещё не готов. Повторите экспорт.')
      const source = serializeSheet(svg)
      if (format === 'svg') download(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`)
      else download(await rasterSheet(source, format), `${filename}.${format === 'jpeg' ? 'jpg' : 'png'}`)
    }
    setMessage(`Файл ${format.toUpperCase()} подготовлен`)
  }
  return <div className={`passport-workbench${registryOpen ? ' has-registry' : ''}${settingsOpen ? ' has-settings' : ''}`}>
    <div className="passport-workspace">
      {registryOpen && <><button type="button" className="passport-pane-backdrop passport-registry-backdrop" aria-label="Закрыть список скважин" onClick={() => setRegistryOpen(false)} /><aside className="passport-registry" aria-label="Список скважин для паспорта"><WellRegistry well={well} state={registryState} onState={onRegistryState} onSelect={id => { onSelect(id); if (window.innerWidth < 1180) setRegistryOpen(false) }} onClose={() => setRegistryOpen(false)} /></aside></>}
      <section className="passport-document" aria-label="Предпросмотр паспорта">
        <PassportToolbar unsaved={!!storageError} onPrint={print} onExport={() => setDialog('export')} onInfo={() => setDialog('info')} onHelp={() => setDialog('help')}
          registry={<IconButton label={registryOpen ? 'Свернуть реестр' : 'Показать список скважин'} onClick={() => setRegistryOpen(!registryOpen)}>{registryOpen ? <PanelLeftClose size={17} aria-hidden="true" /> : <PanelLeftOpen size={17} aria-hidden="true" />}</IconButton>}
          view={<>
            <IconButton label="Уменьшить предпросмотр" disabled={zoomPercent <= 25} onClick={() => setZoom(Math.max(25, Math.round(zoomPercent / 10) * 10 - 10))}><ZoomOut size={17} aria-hidden="true" /></IconButton>
            <span className="passport-zoom-value" aria-label="Увеличение предпросмотра">{zoomPercent}%</span>
            <IconButton label="Увеличить предпросмотр" disabled={zoomPercent >= 175} onClick={() => setZoom(Math.min(175, Math.round(zoomPercent / 10) * 10 + 10))}><ZoomIn size={17} aria-hidden="true" /></IconButton>
            <IconButton label="Вписать по ширине" pressed={zoom === 'width'} onClick={() => setZoom('width')}><UnfoldHorizontal size={17} aria-hidden="true" /></IconButton>
            <IconButton label="Показать лист целиком" pressed={zoom === 'page'} onClick={() => setZoom('page')}><Maximize size={17} aria-hidden="true" /></IconButton>
          </>}
        >
        <div className="passport-document-context"><div className="passport-document-details"><h1>{well.name}</h1><span className="passport-well-purpose">{well.purpose}</span><span>{number(settings.from)}–{number(settings.to)} м</span><span>1:{settings.scale}</span></div><span>{sampling ? 'Расширенный лист · опробование' : 'A3 · книжный'}</span></div>
        {storageError && <div className="passport-storage-error" role="alert">{storageError}</div>}
        <div ref={stage} className="passport-preview-scroll"><div className="passport-paper-wrap" ref={paper} style={{ width: paperWidth }}><PassportSheet sampling={sampling} well={well} settings={settings} range={page} pageNumber={pageIndex + 1} pageCount={pages.length} onTrack={id => setDialog(id)} /></div></div>
        <div className="passport-preview-footer"><span className="passport-preview-tip">Наведите указатель на ГК или ЭК/ПС для значений; нажмите для таблицы</span><div className="passport-pagination"><IconButton label="Предыдущий лист" disabled={pageIndex === 0} onClick={() => { setPageIndex(pageIndex - 1); stage.current?.scrollTo({ top: 0, left: 0 }) }}><ChevronLeft size={17} /></IconButton><label><span>Лист</span><select aria-label="Номер листа паспорта" value={pageIndex} onChange={e => { setPageIndex(Number(e.target.value)); stage.current?.scrollTo({ top: 0, left: 0 }) }}>{pages.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select><span>из {pages.length}</span></label><IconButton label="Следующий лист" disabled={pageIndex === pages.length - 1} onClick={() => { setPageIndex(pageIndex + 1); stage.current?.scrollTo({ top: 0, left: 0 }) }}><ChevronRight size={17} /></IconButton></div><span className="passport-page-range">{number(page.from)}–{number(page.to)} м</span></div>
        </PassportToolbar>
      </section>
      <PassportInspector open={settingsOpen} onToggle={() => setSettingsOpen(open => !open)}>
        <PassportSettingsPanel well={well} settings={settings} onChange={patch} onTrack={id => setDialog(id)} />
      </PassportInspector>
    </div>
    {message && <div className="passport-toast" role="status">{message}</div>}
    {dialog === 'template' && <TemplateDialog selected={settings.template} onClose={() => setDialog(null)} onSelect={id => { patch({ template: id, tracks: [...templates.find(t => t.id === id)!.tracks] }); setDialog(null) }} />}
    {dialog === 'info' && <WellDetailsDialog well={well} onClose={() => setDialog(null)} />}
    {dialog === 'export' && <ExportDialog sampling={sampling} well={well} page={pageIndex + 1} count={pages.length} onExport={exportDocument} onClose={() => setDialog(null)} />}
    {dialog === 'help' && <WorkspaceDialog title="Как работать с паспортом" size="compact" onClose={() => setDialog(null)} footer={<Button variant="secondary" onClick={() => setDialog(null)}>Понятно</Button>}><ol className="passport-help"><li><strong>Выберите скважину</strong><p>Поиск и группы слева помогают найти нужный паспорт.</p></li><li><strong>Настройте документ</strong><p>Уточните интервал, масштаб, источник рудных интервалов и реквизиты. Вид листа следует утверждённому образцу.</p></li><li><strong>Проверьте листы</strong><p>Переключайте страницы под чертежом. Увеличение экрана меняет только просмотр; масштаб 1:{settings.scale} задаёт глубину на печатном листе.</p></li><li><strong>Подготовьте выдачу</strong><p>Экспортируйте текущий лист в SVG, PNG или JPEG, весь интервал в Excel. Печать и PDF включают все {cellText(pages.length)} листов.</p></li></ol></WorkspaceDialog>}
    {dialog && !['template', 'export', 'info', 'help'].includes(dialog) && <TrackDialog id={dialog as TrackId} well={well} settings={settings} onClose={() => setDialog(null)} />}
    {createPortal(<div className={`passport-print${sampling ? ' passport-print--sampling' : ''}`} aria-hidden="true">{pages.map((range, i) => <div className="passport-print-page" key={`${range.from}-${range.to}`}><PassportSheet sampling={sampling} well={well} settings={settings} range={range} pageNumber={i + 1} pageCount={pages.length} /></div>)}</div>, document.body)}
  </div>
}

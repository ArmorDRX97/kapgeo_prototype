import { Check, Download, FileImage, FileSpreadsheet, FileText, Layers3, Waves } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { cellText, dataRows } from './documentActions'
import { number, templates, trackDefinitions, type PassportSettings, type PassportWell, type TemplateId, type TrackId } from './model'

export function TemplateDialog({ selected, onSelect, onClose }: { selected: TemplateId; onSelect: (id: TemplateId) => void; onClose: () => void }) {
  const [choice, setChoice] = useState(selected)
  return <WorkspaceDialog title="Шаблон паспорта" size="compact" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onSelect(choice)}>Применить шаблон</Button></>}>
    <p className="passport-dialog-intro">Шаблон задаёт начальный состав дорожек. Затем его можно настроить под скважину.</p>
    <div className="passport-template-list" role="group" aria-label="Варианты паспорта">{templates.map(t => { const Icon = t.id === 'hydro' ? Waves : t.id === 'core' ? Layers3 : FileText; return <button type="button" key={t.id} aria-pressed={choice === t.id} onClick={() => setChoice(t.id)}><Icon size={24} /><span><strong>{t.name}</strong><small>{t.description}</small></span>{choice === t.id && <Check size={18} />}</button> })}</div>
    <p className="passport-muted">Диапазон, масштаб и реквизиты документа сохранятся.</p>
  </WorkspaceDialog>
}
export function TrackDialog({ id, well, settings, onClose }: { id: TrackId; well: PassportWell; settings: PassportSettings; onClose: () => void }) {
  const def = trackDefinitions.find(t => t.id === id)!, data = dataRows(id, well, settings)
  return <WorkspaceDialog title={`Данные дорожки «${def.name}»`} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
    <div className="passport-data-caption"><span>{well.name} · {number(settings.from)}–{number(settings.to)} м</span><span>{id === 'gamma' || id === 'resistivity' || id === 'knd' ? 'Каротаж 16.10.2026 · шаг таблицы 5 м' : id === 'lithology' ? { summary: 'Сводная литология', core: 'Литология по керну', logging: 'Литология по каротажу' }[settings.lithology] : def.detail}</span></div>
    <div className="passport-data-table"><table><thead><tr>{data.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{data.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cellText(cell)}</td>)}</tr>)}</tbody></table>{!data.rows.length && <div className="passport-table-empty">В выбранном диапазоне данных нет.</div>}</div>
  </WorkspaceDialog>
}
export function WellDetailsDialog({ well, onClose }: { well: PassportWell; onClose: () => void }) {
  return <WorkspaceDialog title={`Сведения о скважине ${well.name}`} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
    <dl className="passport-facts">{[['Месторождение', 'Инкай'], ['Участок / блок', `№ 2 / ${well.block}`], ['Назначение', well.purpose], ['Глубина', `${number(well.depth)} м`], ['X устья', `${number(well.x)} м`], ['Y устья', `${number(well.y)} м`], ['Z устья', `${number(well.z)} м`], ['Продуктивный горизонт', 'Мынкудукский · K₂'], ['Бурение завершено', '14.10.2026'], ['Каротаж', '16.10.2026 · СК-1-76'], ['Гамма-зонд', 'СРП-68 · K = 1,02'], ['Диаметр ствола', '110 мм']].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    {well.kind === 'hydro' && <><h3 className="passport-dialog-subtitle">Журнал откачки · 18.10.2026</h3><div className="passport-data-table"><table><thead><tr><th>Время</th><th>Дебит, м³/ч</th><th>Понижение, м</th><th>Уровень, м</th></tr></thead><tbody>{[['08:00', '8,0', '4,1', '30,5'], ['10:00', '10,5', '6,0', '32,4'], ['14:00', '12,4', '7,1', '33,5'], ['20:00', '12,4', '7,2', '33,6'], ['08:00 +1 сутки', '12,4', '7,2', '33,6']].map(row => <tr key={row[0]}>{row.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div></>}
  </WorkspaceDialog>
}
export type ExportFormat = 'pdf' | 'svg' | 'png' | 'jpeg' | 'xls'
const formats = [
  { id: 'pdf', name: 'PDF / печать', detail: 'Все листы · через окно печати', icon: FileText },
  { id: 'svg', name: 'SVG', detail: 'Векторный чертёж · текущий лист', icon: FileText },
  { id: 'png', name: 'PNG', detail: '2520 × 1782 px · текущий лист', icon: FileImage },
  { id: 'jpeg', name: 'JPEG', detail: '2520 × 1782 px · текущий лист', icon: FileImage },
  { id: 'xls', name: 'Excel', detail: 'Таблицы выбранных дорожек · весь интервал', icon: FileSpreadsheet },
] as const
export function ExportDialog({ well, page, count, onExport, onClose }: { well: PassportWell; page: number; count: number; onExport: (format: ExportFormat) => Promise<void>; onClose: () => void }) {
  const [format, setFormat] = useState<ExportFormat>('pdf'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const run = async () => { setBusy(true); setError(''); try { await onExport(format); onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось подготовить документ.'); setBusy(false) } }
  return <WorkspaceDialog title="Экспорт паспорта" size="compact" pending={busy} onClose={onClose} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Отмена</Button><Button disabled={busy} onClick={() => void run()}><Download size={16} />{busy ? 'Подготовка…' : format === 'pdf' ? 'Открыть печать' : 'Скачать файл'}</Button></>}>
    <div className="passport-export-summary"><FileText size={25} /><div><strong>{well.name} · Паспорт скважины</strong><span>A3, альбомный · Лист {page} из {count}</span></div></div>
    <div className="passport-format-list" role="group" aria-label="Формат экспорта">{formats.map(f => <button key={f.id} type="button" disabled={busy} aria-pressed={format === f.id} onClick={() => setFormat(f.id)}><f.icon size={19} /><span><strong>{f.name}</strong><small>{f.detail}</small></span>{format === f.id && <Check size={17} />}</button>)}</div>
    {format === 'pdf' && <p className="passport-muted">В окне печати выберите «Сохранить как PDF». Формат A3, альбомная ориентация, масштаб 100%, без колонтитулов браузера.</p>}
    {error && <p className="passport-error" role="alert">{error}</p>}
  </WorkspaceDialog>
}

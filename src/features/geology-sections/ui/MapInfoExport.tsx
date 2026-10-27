import { sectionMapInfo } from '../model/mapInfo'
import { useState } from 'react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { saveText } from '../../geology-data/model'

export function MapInfoExport({ section }: { section: GeologySection }) {
  const [open, setOpen] = useState(false), [error, setError] = useState('')
  return <><Button size="sm" variant="secondary" onClick={() => setOpen(true)}>MapInfo</Button>{open && <WorkspaceDialog title="Разрез → MapInfo MIF/MID" onClose={() => setOpen(false)}><p>{section.title}. Выгружаются траектории скважин состава разреза и ручные графические границы.</p><p>Оси: горизонталь — метраж вдоль профиля, вертикаль — абсолютная отметка Z, метры. Это плоскость разреза, не географическая карта. Автоматические заливки корреляций, каротажи и оформление листа не включаются.</p><p>Скачайте оба файла с одинаковым именем в одну папку, затем импортируйте MIF в MapInfo Pro 15.2 или новее. Фактический импорт в MapInfo ещё не проверен.</p><div className="data-actions">{(['mif', 'mid'] as const).map(ext => <Button key={ext} onClick={() => { try { const result = sectionMapInfo(section); if (!result.count) throw new Error('Нет геометрии для выгрузки'); saveText(result[ext], `${section.id}.${ext}`) } catch (e) { setError((e as Error).message) } }}>Скачать .{ext}</Button>)}</div>{error && <p role="alert">{error}</p>}</WorkspaceDialog>}</>
}

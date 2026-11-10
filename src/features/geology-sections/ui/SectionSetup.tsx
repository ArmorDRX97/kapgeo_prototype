import { useState } from 'react'
import { Map, Search, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { sectionSegments, projectSectionPoint } from '../../../entities/geology-section/lib/segments'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { planNumber as number, toFieldPoint, profileVertexName } from '../model/sectionPlan'
import { SectionOverview } from './SectionOverview'
import { ProfileEditor } from './ProfileEditor'
import { SectionWells } from './SectionWells'
import './section-catalog.css'

type Props = { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void; onMap?: (wellId?: string) => void; onPending?: (pending: boolean) => void; segment?: number; onSegment?: (index: number | undefined) => void }
const pageSize = 40
export function SectionSetup(props: Props) {
  const [localSegment, setLocalSegment] = useState(props.segment)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<'wells' | 'profile' | null>(null)
  const [pageState, setPageState] = useState({ key: '', page: 0 })
  const { section, onSegment } = props
  const segments = sectionSegments(section)
  const active = segments.find(segment => segment.index === (onSegment ? props.segment : localSegment))
  const ids = active?.wellIds ?? section.wellIds
  const searchTerm = query.trim().toLocaleLowerCase()
  const wells = sectionSources(section).filter(w => ids.includes(w.id) && w.name.toLocaleLowerCase().includes(searchTerm))
  const pageCount = Math.max(1, Math.ceil(wells.length / pageSize))
  const pageKey = `${active?.id ?? 'all'}|${query}`
  const page = pageState.key === pageKey ? Math.min(pageState.page, pageCount - 1) : 0
  const choose = (value: string) => {
    const index = value === '' ? undefined : Number(value)
    if (onSegment) onSegment(index)
    else setLocalSegment(index)
    setPageState({ key: '', page: 0 })
  }
  return <div className="section-setup section-catalog section-document-setup">
    <header className="section-catalog__header"><h2>Профиль разреза</h2><div className="section-catalog__actions"><Button size="sm" variant="secondary" disabled={props.disabled} onClick={() => setDialog('profile')}><Settings2 size={15} />Настроить профиль</Button>{props.onMap && <Button size="sm" variant="secondary" onClick={() => props.onMap?.()}><Map size={15} />На карту разреза</Button>}</div></header>
    <details className="section-document-setup__parameters"><summary>Параметры разреза <span>{section.depositName} · {section.year} · {section.kind === 'main' ? 'Основной' : 'Вспомогательный'}</span></summary><SectionOverview {...props} /></details>
    <section className="section-catalog__wells" aria-label="Скважины выбранного разреза">
      <header>
        <h3>Скважины разреза <span>{wells.length}</span></h3>
        <div className="section-catalog__well-filters">
          <select aria-label="Фильтр по сегменту" value={active?.index ?? ''} disabled={!segments.length} onChange={event => choose(event.target.value)}>
            <option value="">Весь разрез</option>
            {segments.map(segment => <option key={segment.id} value={segment.index}>Сегмент {segment.index + 1} · {profileVertexName(segment.index)} → {profileVertexName(segment.index + 1)} · {number(segment.length)} м</option>)}
          </select>
          <label className="section-catalog__search"><Search size={15} aria-hidden="true" /><input aria-label="Поиск скважины разреза" value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти скважину в разрезе" /></label>
          {query && <Button size="sm" variant="quiet" onClick={() => setQuery('')}>Сбросить поиск</Button>}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setDialog('wells')}>Состав скважин</Button>
      </header>
        <div className="section-catalog__table-scroll"><table className="section-table" aria-label="Скважины разреза"><thead><tr><th>Скважина</th><th>Сегмент</th><th>X, м</th><th>Y, м</th><th>Глубина, м</th><th>По профилю, м</th>{props.onMap && <th aria-label="Открыть на карте"><Map size={14} aria-hidden="true" /></th>}</tr></thead><tbody>{wells.slice(page * pageSize, (page + 1) * pageSize).map(w => {
          const s = segments.find(s => s.wellIds.includes(w.id)), p = toFieldPoint(w.collar)
          return <tr key={w.id} tabIndex={props.onMap ? 0 : undefined} onClick={() => props.onMap?.(w.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); props.onMap?.(w.id) } }}><th scope="row">{w.name}</th><td>{s ? `Сегмент ${s.index + 1}` : 'Не назначен'}</td><td>{number(p.x)}</td><td>{number(p.y)}</td><td>{number(w.depth)}</td><td>{number(projectSectionPoint(section, w.id, w.collar).station)}</td>{props.onMap && <td><Button className="section-catalog__map-button" variant="quiet" size="sm" aria-label={`Показать ${w.name} на карте`} onClick={event => { event.stopPropagation(); props.onMap?.(w.id) }}><Map size={15} /></Button></td>}</tr>
        })}</tbody></table>{!wells.length && <div className="section-catalog__empty"><p>{searchTerm ? 'Скважины не найдены' : active ? 'В этот сегмент скважины ещё не назначены' : 'В разрезе пока нет скважин'}</p></div>}</div>
      {pageCount > 1 && <footer><span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, wells.length)} из {wells.length}</span><div><Button size="sm" variant="quiet" aria-label="Предыдущая страница скважин" disabled={page === 0} onClick={() => setPageState({ key: pageKey, page: page - 1 })}><ChevronLeft size={16} /></Button><span>Страница {page + 1} из {pageCount}</span><Button size="sm" variant="quiet" aria-label="Следующая страница скважин" disabled={page + 1 === pageCount} onClick={() => setPageState({ key: pageKey, page: page + 1 })}><ChevronRight size={16} /></Button></div></footer>}
    </section>
    {dialog && <WorkspaceDialog dirty={false} title={dialog === 'wells' ? 'Состав скважин разреза' : 'Настройка профиля разреза'} onClose={() => setDialog(null)} footer={<Button variant="secondary" onClick={() => setDialog(null)}>Закрыть</Button>}>{dialog === 'wells' ? <SectionWells {...props} segmentId={active?.id} showRadiusControl={false} /> : <ProfileEditor {...props} coordinateTransform={toFieldPoint} />}</WorkspaceDialog>}
  </div>
}

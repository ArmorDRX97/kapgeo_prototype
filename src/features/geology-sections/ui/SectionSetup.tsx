import { useState } from 'react'
import { Map, Search, Route, Ruler, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { sectionSegments, projectSectionPoint } from '../../../entities/geology-section/lib/segments'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { planNumber as number, toFieldPoint, profileVertexName } from '../model/sectionPlan'
import { SectionOverview } from './SectionOverview'
import { ProfileEditor } from './ProfileEditor'
import { SectionWells } from './SectionWells'
import './section-catalog.css'

type Props = { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void; onMap?: (wellId?: string) => void; onPending?: (pending: boolean) => void; segment?: number; onSegment?: (index: number) => void }
const pageSize = 40
export function SectionSetup(props: Props) {
  const [localSegment, setLocalSegment] = useState(0), [query, setQuery] = useState(''), [scope, setScope] = useState('all'), [dialog, setDialog] = useState<'wells' | 'profile' | null>(null), [pageState, setPageState] = useState({ key: '', page: 0 })
  const { section } = props, segments = sectionSegments(section), index = Math.min(props.segment ?? localSegment, segments.length - 1), active = segments[index]
  const source = sectionSources(section), members = source.filter(w => section.wellIds.includes(w.id)), ids = scope === 'segment' ? active?.wellIds ?? [] : section.wellIds
  const wells = members.filter(w => ids.includes(w.id) && w.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const pageKey = `${scope}|${index}|${query}`, page = pageState.key === pageKey ? Math.min(pageState.page, Math.max(0, Math.ceil(wells.length / pageSize) - 1)) : 0
  const choose = (i: number) => { setLocalSegment(i); props.onSegment?.(i) }
  return <div className="section-setup section-catalog section-document-setup">
    <header className="section-catalog__header"><div><h2>Профиль разреза</h2><p>Сегменты и скважины выбранного разреза «{section.title}».</p></div><div className="section-catalog__actions"><Button size="sm" variant="secondary" disabled={props.disabled} onClick={() => setDialog('profile')}><Settings2 size={15} />Настроить профиль</Button>{props.onMap && <Button size="sm" variant="secondary" onClick={() => props.onMap?.()}><Map size={15} />На карту разреза</Button>}</div></header>
    <div className="section-catalog__summary" aria-label="Состав выбранного разреза"><span><Route size={15} /><strong>1</strong> профиль</span><span><strong>{segments.length}</strong> сегм.</span><span><strong>{members.length}</strong> скв.</span><span><Ruler size={15} /><strong>{number(profileLength(section.profile))}</strong> м</span><span>Z {section.bottom}…{section.top} м</span></div>
    <details className="section-document-setup__parameters"><summary>Параметры разреза <span>{section.depositName} · {section.year} · {section.kind === 'main' ? 'Основной' : 'Вспомогательный'}</span></summary><SectionOverview {...props} /></details>
    <div className="section-catalog__workspace">
      <aside className="section-catalog__profiles" aria-label="Сегменты выбранного разреза"><header><h3>Сегменты профиля <span>{segments.length}</span></h3><p>По направлению от начала к концу</p></header><nav aria-label="Список сегментов">{segments.map(s => {
        return <button type="button" className="section-catalog__profile section-document-setup__segment" key={s.id} aria-current={s.index === index ? 'true' : undefined} onClick={() => choose(s.index)}><span><Route size={15} /><strong>Сегмент {s.index + 1}</strong>{s.index === index && <i aria-hidden="true" />}</span><small>{profileVertexName(s.index)} → {profileVertexName(s.index + 1)} · {s.wellIds.length} скв. · {number(s.length)} м</small></button>
      })}</nav><footer className="section-document-setup__direction">Начало профиля → конец профиля</footer></aside>
      <section className="section-catalog__wells" aria-label="Скважины выбранного разреза"><header><div><h3>Скважины разреза <span>{members.length}</span></h3><p>{scope === 'segment' ? `Сегмент ${index + 1} · ${wells.length} скв.` : 'Общий состав профиля'}</p></div><div className="section-catalog__scope" role="group" aria-label="Область списка скважин"><button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Весь разрез</button><button type="button" aria-pressed={scope === 'segment'} onClick={() => setScope('segment')}>Сегмент {index + 1}</button></div></header>
        <div className="section-catalog__well-filters"><label className="section-catalog__search"><Search size={15} /><input aria-label="Поиск скважины разреза" value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти скважину в разрезе" /></label><Button size="sm" variant="secondary" onClick={() => setDialog('wells')}>Состав скважин</Button>{query && <Button size="sm" variant="quiet" onClick={() => setQuery('')}>Сбросить</Button>}</div>
        <div className="section-catalog__table-scroll"><table className="section-table" aria-label="Скважины разреза"><thead><tr><th>Скважина</th><th>Сегмент</th><th>X, м</th><th>Y, м</th><th>Глубина, м</th><th>По профилю, м</th>{props.onMap && <th aria-label="Открыть на карте"><Map size={14} aria-hidden="true" /></th>}</tr></thead><tbody>{wells.slice(page * pageSize, (page + 1) * pageSize).map(w => {
          const s = segments.find(s => s.wellIds.includes(w.id)), p = toFieldPoint(w.collar)
          return <tr key={w.id} tabIndex={props.onMap ? 0 : undefined} onClick={() => props.onMap?.(w.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); props.onMap?.(w.id) } }}><th scope="row">{w.name}</th><td>{s ? `Сегмент ${s.index + 1}` : 'Не назначен'}</td><td>{number(p.x)}</td><td>{number(p.y)}</td><td>{number(w.depth)}</td><td>{number(projectSectionPoint(section, w.id, w.collar).station)}</td>{props.onMap && <td><Button className="section-catalog__map-button" variant="quiet" size="sm" aria-label={`Показать ${w.name} на карте`} onClick={event => { event.stopPropagation(); props.onMap?.(w.id) }}><Map size={15} /></Button></td>}</tr>
        })}</tbody></table>{!wells.length && <div className="section-catalog__empty"><p>{query ? 'Скважины не найдены' : scope === 'segment' ? 'В этот сегмент скважины ещё не назначены' : 'В разрезе пока нет скважин'}</p>{query && <Button size="sm" variant="quiet" onClick={() => setQuery('')}>Сбросить поиск</Button>}</div>}</div>
        <footer><span>{wells.length ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, wells.length)} из ${wells.length}` : '0 скважин'}</span><div><Button size="sm" variant="quiet" aria-label="Предыдущая страница скважин" disabled={page === 0} onClick={() => setPageState({ key: pageKey, page: page - 1 })}><ChevronLeft size={16} /></Button><span>Страница {page + 1} из {Math.max(1, Math.ceil(wells.length / pageSize))}</span><Button size="sm" variant="quiet" aria-label="Следующая страница скважин" disabled={(page + 1) * pageSize >= wells.length} onClick={() => setPageState({ key: pageKey, page: page + 1 })}><ChevronRight size={16} /></Button></div></footer>
      </section>
    </div>
    {dialog && <WorkspaceDialog title={dialog === 'wells' ? 'Состав скважин разреза' : 'Настройка профиля разреза'} onClose={() => setDialog(null)} footer={<Button variant="secondary" onClick={() => setDialog(null)}>Закрыть</Button>}>{dialog === 'wells' ? <SectionWells {...props} segmentId={active?.id} showRadiusControl={false} /> : <ProfileEditor {...props} coordinateTransform={toFieldPoint} />}</WorkspaceDialog>}
  </div>
}

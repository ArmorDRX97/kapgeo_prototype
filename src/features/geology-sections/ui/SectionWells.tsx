import { useState } from 'react'
import { pointAtDepth, profileIssues, projectToProfile } from '../../../entities/geology-section/lib/profile'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { changeSectionWells } from '../model/wells'

export function SectionWells({ section, disabled, onChange }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void }) {
  const [filter, setFilter] = useState(''), [corridor, setCorridor] = useState(30), [preview, setPreview] = useState<{ ids: string[]; profile: string } | null>(null)
  const profileKey = JSON.stringify(section.profile), matches = preview?.profile === profileKey ? preview.ids : null
  const validProfile = !profileIssues(section.profile).length
  return <section><h2>Состав скважин</h2><p className="section-muted">Выбор скважин не перестраивает трассу. Добавленные скважины включаются в нужные слои отдельно.</p><label className="section-search">Поиск скважины<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Название скважины" /></label>
    <div className="section-table-scroll"><table className="section-table" aria-label="Скважины разреза"><thead><tr><th>В разрезе</th><th>Скважина</th><th>Глубина MD, м</th><th>Высота забоя Z, м</th><th>Вдоль профиля, м</th><th>До трассы, м</th></tr></thead><tbody>{sectionSources(section).filter(w => w.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(w => {
      const bottom = pointAtDepth(w, w.depth), projected = validProfile ? projectToProfile(bottom, section.profile) : null
      return <tr key={w.id}><td><input type="checkbox" aria-label={`Включить ${w.name} в разрез`} checked={section.wellIds.includes(w.id)} disabled={disabled} onChange={e => onChange(changeSectionWells(section, e.target.checked ? [...section.wellIds, w.id] : section.wellIds.filter(id => id !== w.id)))} /></td><th scope="row">{w.name}</th><td>{w.depth.toFixed(1)}</td><td>{bottom.z.toFixed(2)}</td><td>{projected?.station.toFixed(2) ?? '—'}</td><td>{projected?.distance.toFixed(2) ?? '—'}</td></tr>
    })}</tbody></table></div>
    {!sectionSources(section).some(w => w.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())) && <p>Скважины по запросу не найдены.</p>}
    <div className="section-actions"><label>Полуширина коридора, м<input type="number" min="0" value={Number.isFinite(corridor) ? corridor : ''} disabled={disabled} onChange={e => { setCorridor(e.target.valueAsNumber); setPreview(null) }} /></label><Button variant="secondary" disabled={disabled || !validProfile || !Number.isFinite(corridor) || corridor < 0} onClick={() => setPreview({ profile: profileKey, ids: sectionSources(section).filter(w => projectToProfile(pointAtDepth(w, w.depth), section.profile).distance <= corridor).map(w => w.id) })}>Подобрать по коридору</Button></div>
    {matches && <div className="section-preview"><p>Найдены {matches.length}: {sectionSources(section).filter(w => matches.includes(w.id)).map(w => w.name).join(', ') || 'нет скважин'}.</p><p>Будут добавлены к текущему составу без дубликатов.</p><Button disabled={disabled} onClick={() => { onChange(changeSectionWells(section, [...new Set([...section.wellIds, ...matches])])); setPreview(null) }}>Применить подбор</Button><Button variant="quiet" onClick={() => setPreview(null)}>Отмена</Button></div>}
  </section>
}

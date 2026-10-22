import { mapDistance, mapSegments } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { useMemo, useState } from 'react'
import { pointAtDepth, profileIssues } from '../../../entities/geology-section/lib/profile'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { changeSectionWells } from '../model/wells'
import { projectSectionPoint } from '../../../entities/geology-section/lib/segments'
import { segmentRadius, withSegmentRadius } from '../../../entities/geology-section/lib/segmentRadius'
import { sectionWellCatalogue } from '../model/wellAssignment'
import { projectToProfile } from '../../../entities/geology-section/lib/profile'

const defaultRadiusM = 20

export function SectionWells({ section, disabled, onChange, segmentId, showRadiusControl = true }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void; segmentId?: string; showRadiusControl?: boolean }) {
  const [filter, setFilter] = useState('')
  const [preview, setPreview] = useState<{ ids: string[]; profile: string; radiusM: number } | null>(null)
  const segment = segmentId ? mapSegments(section).find(s => s.id === segmentId) : undefined
  const radiusM = segment ? segmentRadius(section, segment.id) : section.profileRadiusM ?? defaultRadiusM
  const profileKey = JSON.stringify([section.profile,section.mapGeometry,segmentId])
  const matches = preview?.profile === profileKey && preview.radiusM === radiusM ? preview.ids : null
  const validProfile = !profileIssues(section.profile).length
  const wells = useMemo(() => sectionWellCatalogue(section), [section])
  const [limitState, setLimitState] = useState({ query: '', limit: 40 })
  const limit = limitState.query === filter ? limitState.limit : 40
  const filtered = wells.filter(w => w.name.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()))
  const distanceToLine = (p: { x: number; y: number }) => segment ? projectToProfile(p, [segment.a, segment.b]).distance : mapDistance(section, p)
  return <section>
    <h2>Состав скважин</h2>
    <p className="section-muted">Скважины можно добавить вручную или подобрать по расстоянию от линии профиля.</p>
    <label className="section-search">Поиск скважины<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Название скважины" /></label>
    <div className="section-table-scroll"><table className="section-table" aria-label="Скважины разреза"><thead><tr><th>В разрезе</th><th>Скважина</th><th>Глубина MD, м</th><th>Высота забоя Z, м</th><th>Вдоль профиля, м</th><th>До линии профиля, м</th></tr></thead><tbody>{filtered.slice(0, limit).map(item => {
      const source = sectionSources({ ...section, wellIds: [...new Set([...section.wellIds, item.id])] }).find(w => w.id === item.id)!
      const w = { ...source, collar: { ...source.collar, ...item.collar } }
      const bottom = pointAtDepth(w, w.depth), projected = validProfile ? projectSectionPoint(section, w.id, pointAtDepth(source,w.depth)) : null
      const lineDistance = validProfile ? distanceToLine(w.collar) : null
      return <tr key={w.id}><td><input type="checkbox" aria-label={`Включить ${w.name} в разрез`} checked={section.wellIds.includes(w.id)} disabled={disabled} onChange={e => onChange(changeSectionWells(section, e.target.checked ? [...section.wellIds, w.id] : section.wellIds.filter(id => id !== w.id)))} /></td><th scope="row">{w.name}</th><td>{w.depth.toFixed(1)}</td><td>{bottom.z.toFixed(2)}</td><td>{projected?.station.toFixed(2) ?? '—'}</td><td>{lineDistance?.toFixed(2) ?? '—'}</td></tr>
    })}</tbody></table></div>
    {!filtered.length && <p>Скважины по запросу не найдены.</p>}
    <div className="section-actions"><span className="section-muted">Показано {Math.min(limit, filtered.length)} из {filtered.length}</span>{filtered.length > limit && <Button size="sm" variant="secondary" onClick={() => setLimitState({ query: filter, limit: limit + 40 })}>Показать ещё 40</Button>}</div>
    <div className="section-actions section-well-radius">
      {showRadiusControl && <label>{segment ? `Радиус сегмента ${segment.index + 1}, м` : 'Радиус от линии профиля, м'}<input aria-label={segment ? 'Радиус от линии сегмента, м' : 'Радиус от линии профиля, м'} type="number" min="0" max="100000" step="5" value={Number.isFinite(radiusM) ? radiusM : ''} disabled={disabled} onChange={e => {
        const value = e.currentTarget.valueAsNumber
        setPreview(null)
        if (Number.isFinite(value) && value >= 0 && value <= 100000) onChange(segment ? withSegmentRadius(section, segment.id, value) : { ...section, profileRadiusM: value })
      }} /></label>}
      <Button variant="secondary" disabled={disabled || !validProfile || !Number.isFinite(radiusM) || radiusM < 0 || radiusM > 100000} onClick={() => {
        const nearby = wells.filter(well=>distanceToLine(well.collar)<=radiusM).map(well=>({well}))
        setPreview({ profile: profileKey, radiusM, ids: nearby.map(({ well }) => well.id) })
      }}>Найти скважины рядом</Button>
    </div>
    {matches && <div className="section-preview"><p>В радиусе {radiusM} м найдено {matches.length}: {wells.filter(w => matches.includes(w.id)).slice(0, 10).map(w => w.name).join(', ') || 'нет скважин'}{matches.length > 10 ? '…' : ''}.</p><p>Можно добавить скважины в состав разреза; уже включённые не продублируются.</p><Button disabled={disabled} onClick={() => { onChange(changeSectionWells(section, [...new Set([...section.wellIds, ...matches])])); setPreview(null) }}>Добавить в разрез</Button><Button variant="quiet" onClick={() => setPreview(null)}>Отмена</Button></div>}
  </section>
}

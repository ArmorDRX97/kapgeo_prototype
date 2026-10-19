import { mapDistance, mapSources } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { useState } from 'react'
import { pointAtDepth, profileIssues } from '../../../entities/geology-section/lib/profile'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { changeSectionWells } from '../model/wells'
import { projectSectionPoint } from '../../../entities/geology-section/lib/segments'

const defaultRadiusM = 20

export function SectionWells({ section, disabled, onChange }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void }) {
  const [filter, setFilter] = useState('')
  const [preview, setPreview] = useState<{ ids: string[]; profile: string; radiusM: number } | null>(null)
  const radiusM = section.profileRadiusM ?? defaultRadiusM
  const profileKey = JSON.stringify([section.profile,section.mapGeometry])
  const matches = preview?.profile === profileKey && preview.radiusM === radiusM ? preview.ids : null
  const validProfile = !profileIssues(section.profile).length
  const wells = mapSources(section)
  return <section>
    <h2>Состав скважин</h2>
    <p className="section-muted">Скважины можно добавить вручную или подобрать по расстоянию от линии профиля.</p>
    <label className="section-search">Поиск скважины<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Название скважины" /></label>
    <div className="section-table-scroll"><table className="section-table" aria-label="Скважины разреза"><thead><tr><th>В разрезе</th><th>Скважина</th><th>Глубина MD, м</th><th>Высота забоя Z, м</th><th>Вдоль профиля, м</th><th>До линии профиля, м</th></tr></thead><tbody>{wells.filter(w => w.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(w => {
      const bottom = pointAtDepth(w, w.depth), projected = validProfile ? projectSectionPoint(section, w.id, pointAtDepth(sectionSources(section).find(source=>source.id===w.id)!,w.depth)) : null
      const lineDistance = validProfile ? mapDistance(section,w.collar) : null
      return <tr key={w.id}><td><input type="checkbox" aria-label={`Включить ${w.name} в разрез`} checked={section.wellIds.includes(w.id)} disabled={disabled} onChange={e => onChange(changeSectionWells(section, e.target.checked ? [...section.wellIds, w.id] : section.wellIds.filter(id => id !== w.id)))} /></td><th scope="row">{w.name}</th><td>{w.depth.toFixed(1)}</td><td>{bottom.z.toFixed(2)}</td><td>{projected?.station.toFixed(2) ?? '—'}</td><td>{lineDistance?.toFixed(2) ?? '—'}</td></tr>
    })}</tbody></table></div>
    {!wells.some(w => w.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())) && <p>Скважины по запросу не найдены.</p>}
    <div className="section-actions section-well-radius">
      <label>Радиус от линии профиля, м<input aria-label="Радиус от линии профиля, м" type="number" min="0" max="100000" step="5" value={Number.isFinite(radiusM) ? radiusM : ''} disabled={disabled} onChange={e => {
        const value = e.currentTarget.valueAsNumber
        setPreview(null)
        if (Number.isFinite(value) && value >= 0 && value <= 100000) onChange({ ...section, profileRadiusM: value })
      }} /></label>
      <Button variant="secondary" disabled={disabled || !validProfile || !Number.isFinite(radiusM) || radiusM < 0 || radiusM > 100000} onClick={() => {
        const nearby = wells.filter(well=>mapDistance(section,well.collar)<=radiusM).map(well=>({well}))
        setPreview({ profile: profileKey, radiusM, ids: nearby.map(({ well }) => well.id) })
      }}>Найти скважины рядом</Button>
    </div>
    {matches && <div className="section-preview"><p>В радиусе {radiusM} м найдено {matches.length}: {wells.filter(w => matches.includes(w.id)).map(w => w.name).join(', ') || 'нет скважин'}.</p><p>Можно добавить скважины в состав разреза; уже включённые не продублируются.</p><Button disabled={disabled} onClick={() => { onChange(changeSectionWells(section, [...new Set([...section.wellIds, ...matches])])); setPreview(null) }}>Добавить в разрез</Button><Button variant="quiet" onClick={() => setPreview(null)}>Отмена</Button></div>}
  </section>
}

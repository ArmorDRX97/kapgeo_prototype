import type { GeologySection } from '../../../entities/geology-section/model/types'
import { sectionStageValues, stageNames, type SectionStage } from '../../../entities/geology-section/model/stages'

export function SectionOverview({ section, disabled, onChange }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void }) {
  const change = <K extends keyof GeologySection>(key: K, value: GeologySection[K]) => onChange({ ...section, [key]: value })
  const metadata = (key: 'depositBody' | 'createdOn' | 'compiledBy' | 'checkedBy', value: string) => change('metadata', { depositBody: '', createdOn: '', compiledBy: '', checkedBy: '', ...section.metadata, [key]: value })
  return <section className="section-form" aria-label="Сведения разреза"><h2>Параметры разреза</h2>
    <label className="section-form__wide">Название<input value={section.title} maxLength={120} disabled={disabled} onChange={e => change('title', e.target.value)} /></label>
    <label className="section-form__wide">Месторождение<select value={section.depositId} disabled={disabled} onChange={() => onChange({ ...section, depositId: 'GTR-LOCAL-NORTH', depositName: 'Полигон Северный' })}><option value="GTR-LOCAL-NORTH">Полигон Северный</option></select></label>
    <label>Этап изучения<select value={section.stage} disabled={disabled} onChange={e => change('stage', e.target.value as SectionStage)}>{sectionStageValues.map(stage => <option key={stage} value={stage}>{stageNames[stage]}</option>)}</select></label>
    <label>Тип<select value={section.kind} disabled={disabled} onChange={e => change('kind', e.target.value as GeologySection['kind'])}><option value="main">Основной</option><option value="auxiliary">Вспомогательный</option></select></label>
    <label>Год<input type="number" min={1900} max={2100} value={Number.isFinite(section.year) ? section.year : ''} disabled={disabled} onChange={e => change('year', e.target.valueAsNumber)} /></label>
    <label>Залежь<input value={section.metadata?.depositBody ?? ''} maxLength={120} disabled={disabled} onChange={e => metadata('depositBody', e.target.value)} /></label>
    <label>Верхняя отметка, м<input type="number" step="0.1" value={Number.isFinite(section.top) ? section.top : ''} disabled={disabled} onChange={e => change('top', e.target.valueAsNumber)} /></label>
    <label>Нижняя отметка, м<input type="number" step="0.1" value={Number.isFinite(section.bottom) ? section.bottom : ''} disabled={disabled} onChange={e => change('bottom', e.target.valueAsNumber)} /></label>
    <details className="section-form__wide section-setup__details"><summary>Оформление и описание</summary><div className="section-form">
      <label className="section-form__wide">Описание<textarea rows={3} maxLength={5000} value={section.description} disabled={disabled} onChange={e => change('description', e.target.value)} /></label>
      {(['createdOn', 'compiledBy', 'checkedBy'] as const).map((key, i) => <label key={key} className={key === 'createdOn' ? 'section-form__wide' : undefined}>{['Дата составления', 'Составил', 'Проверил'][i]}<input type={key === 'createdOn' ? 'date' : 'text'} maxLength={key === 'createdOn' ? undefined : 120} value={section.metadata?.[key] ?? ''} disabled={disabled} onChange={e => metadata(key, e.target.value)} /></label>)}
    </div></details>
  </section>
}

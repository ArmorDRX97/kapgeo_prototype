import type { GeologySection } from '../../../entities/geology-section/model/types'

export function SectionOverview({ section, disabled, onChange }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void }) {
  const change = <K extends keyof GeologySection>(key: K, value: GeologySection[K]) => onChange({ ...section, [key]: value })
  return <section className="section-form" aria-label="Сведения разреза"><h2>Сведения о разрезе</h2>
    <label className="section-form__wide">Название<input value={section.title} maxLength={120} disabled={disabled} onChange={e => change('title', e.target.value)} /></label>
    <label>Месторождение<input value={section.depositName} readOnly /></label>
    <label>Этап<select value={section.stage} disabled={disabled} onChange={e => change('stage', e.target.value as GeologySection['stage'])}><option value="exploration">Разведка</option><option value="operation">Эксплуатация</option></select></label>
    <label>Тип<select value={section.kind} disabled={disabled} onChange={e => change('kind', e.target.value as GeologySection['kind'])}><option value="main">Основной</option><option value="auxiliary">Вспомогательный</option></select></label>
    <label>Год<input type="number" min={1900} max={2100} value={Number.isFinite(section.year) ? section.year : ''} disabled={disabled} onChange={e => change('year', e.target.valueAsNumber)} /></label>
    <label>Верхняя отметка, м<input type="number" step="0.1" value={Number.isFinite(section.top) ? section.top : ''} disabled={disabled} onChange={e => change('top', e.target.valueAsNumber)} /></label>
    <label>Нижняя отметка, м<input type="number" step="0.1" value={Number.isFinite(section.bottom) ? section.bottom : ''} disabled={disabled} onChange={e => change('bottom', e.target.valueAsNumber)} /></label>
    <label className="section-form__wide">Описание<textarea rows={3} value={section.description} disabled={disabled} onChange={e => change('description', e.target.value)} /></label>
    {(['depositBody', 'createdOn', 'compiledBy', 'checkedBy'] as const).map((key, i) => <label key={key}>{['Залежь', 'Дата составления', 'Составил', 'Проверил'][i]}<input type={key === 'createdOn' ? 'date' : 'text'} value={section.metadata?.[key] ?? ''} disabled={disabled} onChange={e => change('metadata', { depositBody: '', createdOn: '', compiledBy: '', checkedBy: '', ...section.metadata, [key]: e.target.value })} /></label>)}
    <p className="section-form__wide section-muted">Локальная система координат, метры. Глубина по стволу и абсолютная высота отображаются отдельно.</p>
  </section>
}

import { useState } from 'react'
import type { AlphaDocument, GammaProfile, KrrPoint, OreInterval } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { gammaCorrections } from '../../../entities/interpretation/lib/alphaGamma'
import { Button } from '../../../shared/ui/Button'
import { Group, NumberField, SelectField } from './Fields'

export function GammaProfileEditor({ well, doc, onChange }: { well: InterpretationWell; doc: AlphaDocument; onChange: (doc: AlphaDocument) => void }) {
  const p = doc.parameters.gamma, profile = p.profile, [morphology, setMorphology] = useState<OreInterval['morphology']>('bag')
  const patch = (values: Partial<GammaProfile>) => onChange({ ...doc, parameters: { ...doc.parameters, gamma: { ...p, profile: { ...profile, ...values } } } })
  const number = (key: keyof GammaProfile, label: string) => <NumberField label={label} value={Number(profile[key])} onChange={value => patch({ [key]: value })} />
  const morph = profile.morphology[morphology]
  const morphNumber = (key: keyof typeof morph, label: string) => <NumberField label={label} value={morph[key]} onChange={value => patch({ morphology: { ...profile.morphology, [morphology]: { ...morph, [key]: value } } })} />
  let corrections: string
  try { const c = gammaCorrections(well, doc); corrections = `Ø средний ${c.diameter.toFixed(2)} мм · слой жидкости ${c.fluidMass.toFixed(3)} г/см² · поправка жидкости ×${c.fluidFactor.toFixed(4)} · обсадки ×${c.casingFactor.toFixed(4)}.` } catch (e) { corrections = (e as Error).message }
  return <>
    <Group title="Среда измерения и дополнительные поправки">
      {number('thkCorrection', 'Поправка Th/K в эквиваленте Ra, %')}{number('radonFactor', 'Поправочный множитель радона')}
      <div className="alpha-pair">{number('probeDiameter', 'Диаметр прибора, мм')}{number('fluidDensity', 'Плотность жидкости, г/см³')}</div>
      {number('fluidAttenuation', 'Коэффициент поглощения жидкости, см²/г')}
      <div className="alpha-pair">{number('casingThickness', 'Толщина обсадки, мм')}{number('casingDensity', 'Плотность обсадки, г/см³')}</div>
      {number('casingAttenuation', 'Коэффициент поглощения обсадки, см²/г')}
      <div className="alpha-pair">{number('caliperFrom', 'Первичная КМ: от, м')}{number('caliperTo', 'Первичная КМ: до, м')}</div>
      <p>{corrections}</p><p>Поправка поглощения рассчитывается как exp(μ × массовый слой). При нулевом μ поправка не применяется. Нормативные коэффициенты не заданы.</p>
    </Group>
    <Group title="Зависимости Крр">
      {number('krrImpermeable', 'Крр непроницаемых пород')}
      <SelectField label="Табличная зависимость Крр" value={profile.dependence} onChange={dependence => patch({ dependence: dependence as GammaProfile['dependence'] })} options={[["constant", "Постоянные коэффициенты"], ["thickness", "От мощности руды"], ["radium", "От среднего Ra"]]} />
      {profile.dependence !== 'constant' && <>
        <KrrTable title="Проницаемые породы" points={profile.dependence === 'thickness' ? profile.thicknessPermeable : profile.radiumPermeable} xUnit={profile.dependence === 'thickness' ? 'м' : 'Ra, %'} onChange={points => patch(profile.dependence === 'thickness' ? { thicknessPermeable: points } : { radiumPermeable: points })} />
        <KrrTable title="Непроницаемые породы" points={profile.dependence === 'thickness' ? profile.thicknessImpermeable : profile.radiumImpermeable} xUnit={profile.dependence === 'thickness' ? 'м' : 'Ra, %'} onChange={points => patch(profile.dependence === 'thickness' ? { thicknessImpermeable: points } : { radiumImpermeable: points })} />
      </>}
      <SelectField label="Профиль морфологии" value={morphology} onChange={v => setMorphology(v as typeof morphology)} options={[["bag", "Мешок"], ["upper", "Верхнее крыло"], ["lower", "Нижнее крыло"], ["remnant", "Останец"]]} />
      <div className="alpha-pair">{morphNumber('permeable', 'Морфология: Крр проницаемых')}{morphNumber('impermeable', 'Морфология: Крр непроницаемых')}</div>
      <div className="alpha-pair">{morphNumber('grayA', 'Граница С–С: a')}{morphNumber('grayB', 'Граница С–С: b, Ra %')}</div>
      <div className="alpha-pair">{morphNumber('yellowA', 'Граница С–Ж: a')}{morphNumber('yellowB', 'Граница С–Ж: b, Ra %')}</div>
      <p>Морфологический профиль включается флажком «Учитывать морфологию». Таблица интерполируется линейно, за её краями используется крайнее значение. Совместно с морфологией таблица масштабирует её Крр относительно базового коэффициента.</p>
    </Group>
    <Group title="Кондиции и уточнение границ">
      <SelectField label="Бортовая зависимость Ra" value={profile.cutoffMode} onChange={cutoffMode => patch({ cutoffMode: cutoffMode as GammaProfile['cutoffMode'] })} options={[["fixed", "Борт U × Крр"], ["regression", "max(борт U × Крр; a × Raср + b)"]]} />
      <div className="alpha-pair">{number('cutoffA', 'Бортовая зависимость: a')}{number('cutoffB', 'Бортовая зависимость: b, Ra %')}</div>
      {number('technologicalCutoff', 'Борт технологического забаланса U, %')}{number('minimumMetro', 'Минимальный mc балансовой руды, м·%')}
      {number('impermeableGap', 'Непроницаемый прослой при объединении до, м')}{number('iterations', 'Максимум уточнений контактов')}
      <p>В окончательном режиме применяются зависимости и кондиции комплекса. При включённой морфологии a/b берутся из её профиля; С–Ж выбирается при пересечении ЗПО. Предварительный режим оставляет фиксированные обзорные коэффициенты.</p>
    </Group>
  </>
}
function KrrTable({ title, points, xUnit, onChange }: { title: string; points: KrrPoint[]; xUnit: string; onChange: (points: KrrPoint[]) => void }) {
  const patch = (index: number, values: Partial<KrrPoint>) => onChange(points.map((p, i) => i === index ? { ...p, ...values } : p))
  return <details className="alpha-group"><summary>{title} · {points.length} точек X/Y</summary><div>{points.map((point, index) => <div key={index}>
    <div className="alpha-pair"><NumberField label={`${title}: X${index + 1}, ${xUnit}`} value={point.x} onChange={x => patch(index, { x })} /><NumberField label={`${title}: Y${index + 1}, Крр`} value={point.y} onChange={y => patch(index, { y })} /></div>
    <Button size="sm" variant="quiet" disabled={points.length <= 2} onClick={() => onChange(points.filter((_, i) => i !== index))}>Удалить точку {index + 1}</Button>
  </div>)}<Button size="sm" variant="secondary" disabled={points.length >= 100} onClick={() => onChange([...points, { x: (points.at(-1)?.x ?? 0) + (xUnit === 'м' ? 1 : 0.01), y: points.at(-1)?.y ?? 1 }])}>Добавить точку X/Y</Button></div></details>
}

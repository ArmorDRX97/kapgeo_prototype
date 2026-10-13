import { useState } from 'react'
import type { AlphaDocument, AlphaPage, DepthInterval, MetalMark } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { alphaFingerprint, calculateCurrent, electroMetrics, oreMetrics } from '../../../entities/interpretation/lib/alphaCalculations'
import { assertDepth } from '../../../entities/interpretation/lib/alphaNumeric'
import { overwriteInterval } from '../../../entities/interpretation/lib/commands'
import { Button } from '../../../shared/ui/Button'
import { NumberField, SelectField } from './Fields'

export function ObjectEditor({ well, doc, page, sub, row, onChange, onCancel, onDirty, disabled }: { well: InterpretationWell; doc: AlphaDocument; page: AlphaPage; sub: string; row: DepthInterval | MetalMark; onChange: (doc: AlphaDocument) => void; onCancel: () => void; onDirty: () => void; disabled: boolean }) {
  const [from, setFrom] = useState('depth' in row ? row.depth : row.from), [to, setTo] = useState('to' in row ? row.to : from)
  const [rock, setRock] = useState(doc.electro.rows.find(r => r.id === row.id)?.rock ?? 'sand')
  const [manualKf, setManualKf] = useState(doc.electro.rows.find(r => r.id === row.id)?.kf ?? 3)
  const [morphology, setMorphology] = useState(doc.gamma.rows.find(r => r.id === row.id)?.morphology ?? 'bag')
  const [label, setLabel] = useState('label' in row ? row.label : 'Бентогильзы'), [kind, setKind] = useState(doc.projects.find(r => r.id === row.id)?.kind ?? 'bentonite')
  const [error, setError] = useState('')
  const apply = () => {
    try {
      const next = structuredClone(doc)
      if ('depth' in row) {
        if (!Number.isFinite(from) || from < 0 || from > well.depth) throw new Error('Глубина метки вне скважины.')
        next.metal.rows = [...next.metal.rows.filter(r => r.id !== row.id), { id: row.id, depth: from, label }].sort((a, b) => a.depth - b.depth)
      } else {
        assertDepth(from, to, well.depth); const value = { ...row, from, to }
        if (page === 'electro') {
          if (manualKf < 0 || !Number.isFinite(manualKf)) throw new Error('Кф должен быть неотрицательным.')
          next.electro.rows = overwriteInterval(doc.electro.rows, electroMetrics(well, doc, value, rock, manualKf), well.depth, () => false)
        } else if (page === 'gamma' && sub === 'oxidation') next.oxidation = overwriteInterval(doc.oxidation, value, well.depth, () => false)
        else if (page === 'gamma') next.gamma.rows = overwriteInterval(doc.gamma.rows, oreMetrics(well, doc, value, morphology), well.depth, () => false)
        else if (page === 'current') {
          next.parameters.current = row.id === 'actual-filter' ? { ...doc.parameters.current, from, to } : { ...doc.parameters.current, to: from, sumpBottom: to }
          next.current = calculateCurrent(well, next)
        } else if (page === 'thermal' && sub === 'projects') next.projects = [...doc.projects.filter(r => r.id !== row.id), { ...value, kind, label }]
        else if (page === 'thermal') next.thermal.rows = overwriteInterval(doc.thermal.rows, value, well.depth, () => false)
        else if (page === 'flow') next.sections = overwriteInterval(doc.sections, value, well.depth, () => false)
        else if (page === 'caliper') next.caliper.rows = overwriteInterval(doc.caliper.rows, { ...value, minimum: null, mean: null }, well.depth, () => false)
      }
      // A manual edit is a valid current result, and dependent results keep their previous fingerprint.
      if (page === 'electro') next.electro.fingerprint = alphaFingerprint(well, next, 'electro')
      else if (page === 'gamma' && sub !== 'oxidation') next.gamma.fingerprint = alphaFingerprint(well, next, 'gamma')
      else if (page === 'thermal' && sub === 'induction') next.metal.fingerprint = alphaFingerprint(well, next, 'metal')
      else if (page === 'thermal' && sub !== 'projects') next.thermal.fingerprint = alphaFingerprint(well, next, 'thermal')
      else if (page === 'caliper') next.caliper.fingerprint = alphaFingerprint(well, next, 'caliper')
      onChange(next); onCancel()
    } catch (e) { setError((e as Error).message) }
  }
  return <form onChangeCapture={onDirty} onSubmit={e => { e.preventDefault(); apply() }}><h3>Свойства объекта</h3><fieldset disabled={disabled} className="alpha-parameters">
    <NumberField label={'depth' in row ? 'Глубина метки, м' : 'Объект: кровля, м'} value={from} onChange={setFrom} />{'to' in row && <NumberField label="Объект: подошва, м" value={to} onChange={setTo} />}
    {page === 'electro' && <><SelectField label="Литотип" value={rock} onChange={v => setRock(v as typeof rock)} options={[["sand", "Песок"], ["clay", "Глина"], ["silt", "Алеврит"], ["sandstone", "Песчаник"], ["limestone", "Известняк"], ["unknown", "Не определён"]]} /><NumberField label="Ручной Кф, м/сут" value={manualKf} onChange={setManualKf} /></>}
    {page === 'gamma' && sub !== 'oxidation' && <SelectField label="Морфология руды" value={morphology} onChange={v => setMorphology(v as typeof morphology)} options={[["bag", "Мешок"], ["upper", "Верхнее крыло"], ["lower", "Нижнее крыло"], ["remnant", "Останец"]]} />}
    {page === 'thermal' && (sub === 'induction' || sub === 'projects') && <label className="alpha-field"><span>Название объекта</span><input value={label} onChange={e => setLabel(e.target.value)} /></label>}
    {page === 'thermal' && sub === 'projects' && <SelectField label="Тип проекта" value={kind} onChange={v => setKind(v as typeof kind)} options={[["filter", "Проектный фильтр"], ["bentonite", "Бентогильзы"]]} />}
    <div className="alpha-actions"><Button size="sm" type="submit">Применить объект</Button><Button size="sm" variant="secondary" onClick={onCancel}>Отменить ввод</Button></div>
  </fieldset>{error && <p role="alert">{error}</p>}</form>
}

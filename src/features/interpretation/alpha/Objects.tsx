import { useState } from 'react'
import type { AlphaDocument, AlphaPage, DepthInterval, MetalMark } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { alphaFingerprint, calculateCurrent } from '../../../entities/interpretation/lib/alphaCalculations'
import { assertDepth } from '../../../entities/interpretation/lib/alphaNumeric'
import { rockNames } from '../../../entities/interpretation/lib/alphaElectro'
import { Button } from '../../../shared/ui/Button'
import { CheckField, NumberField, SelectField } from './Fields'
import { cutAlphaInterval, editAlphaInterval, fitFilterSections, refineAlphaOre, intervalKey, mergeAlphaInterval, splitAlphaInterval } from '../../../entities/interpretation/lib/alphaCommands'

export function ObjectEditor({ well, doc, page, sub, row, onChange, onCancel, onDirty, disabled }: { well: InterpretationWell; doc: AlphaDocument; page: AlphaPage; sub: string; row: DepthInterval | MetalMark; onChange: (doc: AlphaDocument) => void; onCancel: () => void; onDirty: () => void; disabled: boolean }) {
  const [from, setFrom] = useState('depth' in row ? row.depth : row.from), [to, setTo] = useState('to' in row ? row.to : from)
  const [rock, setRock] = useState(doc.electro.rows.find(r => r.id === row.id)?.rock ?? 'sand')
  const [lithologyCode, setLithologyCode] = useState(doc.electro.rows.find(r => r.id === row.id)?.lithologyCode ?? '')
  const [geochemistryCode, setGeochemistryCode] = useState(doc.electro.rows.find(r => r.id === row.id)?.geochemistryCode ?? '')
  const [manualKf, setManualKf] = useState(doc.electro.rows.find(r => r.id === row.id)?.kf ?? 3)
  const [morphology, setMorphology] = useState(doc.gamma.rows.find(r => r.id === row.id)?.morphology ?? 'bag')
  const [label, setLabel] = useState('label' in row ? row.label : 'Бентогильзы'), [kind, setKind] = useState(doc.projects.find(r => r.id === row.id)?.kind ?? 'bentonite')
  const [error, setError] = useState('')
  const [splitAt, setSplitAt] = useState((from + to) / 2), [cutFrom, setCutFrom] = useState(from + (to - from) / 3), [cutTo, setCutTo] = useState(from + (to - from) * 2 / 3), [refine, setRefine] = useState(false)
  const apply = () => {
    try {
      let next = structuredClone(doc)
      if ('depth' in row) {
        if (!Number.isFinite(from) || from < 0 || from > well.depth) throw new Error('Глубина метки вне скважины.')
        next.metal.rows = [...next.metal.rows.filter(r => r.id !== row.id), { id: row.id, depth: from, label }].sort((a, b) => a.depth - b.depth)
      } else {
        assertDepth(from, to, well.depth); const value = { ...row, from, to }
        const key = intervalKey(page, sub)
        if (key) {
          if (key === 'electro' && (manualKf < 0 || !Number.isFinite(manualKf))) throw new Error('Кф должен быть неотрицательным.')
          next = key === 'gamma' && refine ? refineAlphaOre(well, doc, value, morphology) : editAlphaInterval(well, doc, key, { ...value, rock, lithologyCode, geochemistryCode, kf: manualKf, manualKf: true, morphology, kind, label })
        } else if (page === 'current') {
          next.parameters.current = row.id === 'actual-filter' ? { ...doc.parameters.current, from, to } : { ...doc.parameters.current, to: from, sumpBottom: to }
          next.current = calculateCurrent(well, next); next = fitFilterSections(next)
        }
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
    {page === 'electro' && <><SelectField label="Литотип" value={rock} onChange={v => setRock(v as typeof rock)} options={Object.entries(rockNames)} /><label className="alpha-field">Литологический код<input maxLength={40} value={lithologyCode} onChange={e=>setLithologyCode(e.target.value)} /></label><label className="alpha-field">Геохимический код<input maxLength={40} value={geochemistryCode} onChange={e=>setGeochemistryCode(e.target.value)} /></label><p>Коды вводятся по таблице заказчика; демонстрационный крап не подтверждён по СТ НАК 16-2026.</p><NumberField label="Ручной Кф, м/сут" value={manualKf} onChange={setManualKf} /></>}
    {page === 'gamma' && sub !== 'oxidation' && <><SelectField label="Морфология руды" value={morphology} onChange={v => setMorphology(v as typeof morphology)} options={[["bag", "Мешок"], ["upper", "Верхнее крыло"], ["lower", "Нижнее крыло"], ["remnant", "Останец"]]} /><CheckField label="Уточнить границы руды по зависимостям" checked={refine} onChange={setRefine} /><p>Уточнение может разделить или исключить интервал, если он не проходит выбранный борт. Без флажка сохраняются заданные вручную границы.</p></>}
    {page === 'thermal' && (sub === 'induction' || sub === 'projects') && <label className="alpha-field"><span>Название объекта</span><input value={label} onChange={e => setLabel(e.target.value)} /></label>}
    {page === 'thermal' && sub === 'projects' && <SelectField label="Тип проекта" value={kind} onChange={v => setKind(v as typeof kind)} options={[["filter", "Проектный фильтр"], ["bentonite", "Бентогильзы"]]} />}
    <div className="alpha-actions"><Button size="sm" type="submit">Применить объект</Button><Button size="sm" variant="secondary" onClick={onCancel}>Отменить ввод</Button></div>
    {'to' in row && intervalKey(page, sub) && <details className="alpha-group"><summary>Разделить / объединить</summary><div><NumberField label="Глубина разделения, м" value={splitAt} onChange={setSplitAt} /><Button size="sm" variant="secondary" onClick={() => { try { onChange(splitAlphaInterval(well, doc, intervalKey(page, sub)!, row.id, splitAt)); onCancel() } catch (e) { setError((e as Error).message) } }}>Разделить интервал</Button><div className="alpha-actions">{(['above', 'below'] as const).map(direction => <Button key={direction} size="sm" variant="quiet" onClick={() => { try { onChange(mergeAlphaInterval(well, doc, intervalKey(page, sub)!, row.id, direction)); onCancel() } catch (e) { setError((e as Error).message) } }}>{direction === 'above' ? 'Объединить с верхним' : 'Объединить с нижним'}</Button>)}</div><p>Объединение включает промежуток между интервалами и сохраняет свойства выбранного объекта.</p></div></details>}
    {'to' in row && intervalKey(page, sub) && page !== 'flow' && <details className="alpha-group"><summary>Вырезать внутреннюю часть</summary><div><div className="alpha-pair"><NumberField label="Вырезать: от, м" value={cutFrom} onChange={setCutFrom} /><NumberField label="Вырезать: до, м" value={cutTo} onChange={setCutTo} /></div><Button size="sm" variant="secondary" onClick={() => { try { onChange(cutAlphaInterval(well, doc, intervalKey(page, sub)!, row.id, cutFrom, cutTo)); onCancel() } catch (e) { setError((e as Error).message) } }}>Вырезать часть объекта</Button><p>Сохраняются обе внешние части с пересчётом показателей. Undo возвращает исходный объект.</p></div></details>}
  </fieldset>{error && <p role="alert">{error}</p>}</form>
}

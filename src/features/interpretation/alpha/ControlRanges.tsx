import { Trash2 } from 'lucide-react'
import type { ControlParameters, ControlRange } from '../../../entities/interpretation/model/alphaTypes'
import { Button } from '../../../shared/ui/Button'
import { NumberField, SelectField } from './Fields'

export function ControlRanges({ value, onChange }: { value: ControlParameters; onChange: (patch: Partial<ControlParameters>) => void }) {
  const patch = (index: number, values: Partial<ControlRange>) => onChange({ pairs: value.pairs.map((r, i) => i === index ? { ...r, ...values } : r) })
  const add = () => {
    let index = value.pairs.length + 1
    while (value.pairs.some(r => r.id === `manual-control-${index}`)) index++
    onChange({ pairs: [...value.pairs, { id: `manual-control-${index}`, from: value.from, to: value.to, controlFrom: value.controlFrom, controlTo: value.controlTo }] })
  }
  return <>
    <SelectField label="Сопоставление интервалов" value={value.pairing} onChange={pairing => onChange({ pairing: pairing as ControlParameters['pairing'] })} options={[["automatic", "Авто по рудным интервалам ГК"], ["manual", "Ручные пары диапазонов"]]} />
    {value.pairing === 'automatic' ? <p>Автоматическое сопоставление применяется к производственному ГК. Для КС, опорной и безрудной скважины сравниваются заданные диапазоны. Не найденные пары остаются в таблице.</p> : <>
      {value.pairs.map((row, index) => <fieldset key={row.id} className="alpha-parameters"><legend>Пара {index + 1}</legend>
        <div className="alpha-pair"><NumberField label={`Пара ${index + 1}: основное от, м`} value={row.from} onChange={from => patch(index, { from })} /><NumberField label={`Пара ${index + 1}: основное до, м`} value={row.to} onChange={to => patch(index, { to })} /></div>
        <div className="alpha-pair"><NumberField label={`Пара ${index + 1}: контроль от, м`} value={row.controlFrom} onChange={controlFrom => patch(index, { controlFrom })} /><NumberField label={`Пара ${index + 1}: контроль до, м`} value={row.controlTo} onChange={controlTo => patch(index, { controlTo })} /></div>
        <Button className="action-delete" size="sm" variant="quiet" onClick={() => onChange({ pairs: value.pairs.filter(r => r.id !== row.id) })}><Trash2 size={15} />Удалить пару {index + 1}</Button>
      </fieldset>)}
      <Button size="sm" variant="secondary" onClick={add} disabled={value.pairs.length >= 100}>Добавить пару диапазонов</Button>
      {!value.pairs.length && <p>Пока сравнивается одна пара из основных диапазонов выше.</p>}
    </>}
  </>
}

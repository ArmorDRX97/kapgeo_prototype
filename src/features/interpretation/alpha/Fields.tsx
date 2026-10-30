import type { ReactNode } from 'react'
import type { MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import { Switch } from '../../../shared/ui/Switch'
export function NumberField({ label, value, onChange, step = 'any', disabled = false }: { label: string; value: number; onChange: (value: number) => void; step?: string | number; disabled?: boolean }) {
  return <label className="alpha-field"><span>{label}</span><input type="number" value={Number.isFinite(value) ? value : ''} step={step} disabled={disabled} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
}
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) {
  return <label className="alpha-field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
}
export function RecordField({ label = 'Запись ГИС', value, records, onChange }: { label?: string; value: string; records: MeasurementRecord[]; onChange: (id: string) => void }) {
  return <SelectField label={label} value={value} onChange={onChange} options={records.map(r => [r.id, `${r.name} · ${r.date}${r.parentId ? ' · корректировка' : ''}`])} />
}
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <Switch label={label} checked={checked} onChange={onChange} />
}
export function Group({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="alpha-group" open={open}><summary>{title}</summary><div>{children}</div></details>
}

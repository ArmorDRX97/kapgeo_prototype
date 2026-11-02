import { ClipboardList, FileText, Layers3 } from 'lucide-react'
import { PassportWorkbench } from './PassportWorkbench'
import { ReferencePassportWorkbench } from './ReferencePassportWorkbench'
import type { PassportWell } from './model'
import './passport-variants.css'

const passportVariants = [
  { id: 'intervals', label: 'Паспорт рудных интервалов' },
  { id: 'sampling', label: 'Паспорт с опробованием' },
  { id: '127-2-2', label: 'Колонка 127СВ-2-2' },
  { id: '127-2-3-1', label: 'Колонка 127СВ-2-3-1' },
] as const
export type PassportVariant = typeof passportVariants[number]['id']

export function PassportVariants({ well, onSelect, variant, onVariant }: { well: PassportWell; onSelect: (id: string) => void; variant: PassportVariant; onVariant: (id: PassportVariant) => void }) {
  const navigation = <nav className="passport-document-menu" aria-label="Паспорта"><h2>Паспорта</h2>{passportVariants.map(item => {
    const Icon = item.id === 'sampling' ? ClipboardList : item.id === 'intervals' ? FileText : Layers3
    return <button type="button" key={item.id} aria-current={item.id === variant ? 'page' : undefined} onClick={() => { if (item.id !== variant) onVariant(item.id) }}><Icon size={17} /><span>{item.label}</span>{item.id === variant && <i aria-hidden="true" />}</button>
  })}</nav>
  return <div className="passport-variants">
    {variant === 'intervals' || variant === 'sampling' ? <PassportWorkbench key={variant} well={well} onSelect={onSelect} sampling={variant === 'sampling'} navigation={navigation} /> : <ReferencePassportWorkbench key={variant} id={variant} navigation={navigation}/>}
  </div>
}

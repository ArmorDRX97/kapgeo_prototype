import { ClipboardList, FileText, Layers3 } from 'lucide-react'
import { WorkspaceTabs } from '../../shared/ui/WorkspaceTabs'
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

const tabs = passportVariants.map(item => {
  const Icon = item.id === 'sampling' ? ClipboardList : item.id === 'intervals' ? FileText : Layers3
  return { id: item.id, label: <><Icon size={15} aria-hidden="true" />{item.label}</> }
})

export function PassportVariants({ well, onSelect, variant, onVariant }: { well: PassportWell; onSelect: (id: string) => void; variant: PassportVariant; onVariant: (id: PassportVariant) => void }) {
  return <div className="passport-variants">
    <WorkspaceTabs tabs={tabs} value={variant} onChange={onVariant} label="Паспорта" compact>
      {variant === 'intervals' || variant === 'sampling'
        ? <PassportWorkbench key={variant} well={well} onSelect={onSelect} sampling={variant === 'sampling'} />
        : <ReferencePassportWorkbench key={variant} id={variant} />}
    </WorkspaceTabs>
  </div>
}

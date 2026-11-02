import { useNavigate, useSearch } from '@tanstack/react-router'
import { FileSearch } from 'lucide-react'
import { useSession } from '../../entities/session/model/sessionContext'
import { PassportVariants } from '../../features/well-passport/PassportVariants'
import { passportWells, validatePassportSearch } from '../../features/well-passport/model'
import { hasPermission } from '../../shared/auth/permissions'
import { Button } from '../../shared/ui/Button'
import { AccessDeniedPage } from '../system/ModulePlaceholderPage'
import { GeologyModuleLayout } from './GeologyModuleLayout'

export function WellPassportsPage() {
  const { persona } = useSession(), navigate = useNavigate(), search = validatePassportSearch(useSearch({ strict: false }))
  const well = search.well ? passportWells.find(w => w.id === search.well) : passportWells[0]!
  if (!hasPermission(persona, 'geology.view')) return <AccessDeniedPage moduleName="Паспорт скважины" />
  return <GeologyModuleLayout>{well ? <PassportVariants well={well} variant={search.variant ?? 'intervals'} onVariant={variant => void navigate({ to: '/geology/passports', search: { ...search, variant: variant === 'intervals' ? undefined : variant }, resetScroll: false })} onSelect={id => void navigate({ to: '/geology/passports', search: { ...search, well: id }, resetScroll: false })} /> : <div className="passport-not-found"><FileSearch size={36} /><h1>Скважина не найдена</h1><p>Откройте паспорт другой скважины из списка.</p><Button onClick={() => void navigate({ to: '/geology/passports', search: {} })}>Открыть паспорта скважин</Button></div>}</GeologyModuleLayout>
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Mountain } from 'lucide-react'
import { getDepositName, type Deposit } from '../../../entities/geology-master/model/types'
import { fetchPlatformPreferences, savePlatformPreferences } from '../../../repository/api'
import { useUiLocale } from '../../../shared/lib/useUiLocale'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import '../geobase.css'

export function DepositPickerDialog({ deposits, currentId, onClose, onSelect }: {
  deposits: Deposit[]
  currentId: string
  onClose: () => void
  onSelect: (depositId: string) => void
}) {
  const locale = useUiLocale()
  const queryClient = useQueryClient()
  const selection = useMutation({
    mutationFn: async (currentDepositId: string) => {
      const preferences = await fetchPlatformPreferences()
      return savePlatformPreferences({
        locale: preferences.locale, density: preferences.density, contrast: preferences.contrast,
        reducedMotion: preferences.reducedMotion, currentDepositId,
      })
    },
    onSuccess: (preferences, depositId) => {
      queryClient.setQueryData(['platform-preferences'], preferences)
      onSelect(depositId)
    },
  })

  return <WorkspaceDialog title="Сменить месторождение" pending={selection.isPending} onClose={onClose} footer={<Button variant="secondary" disabled={selection.isPending} onClick={onClose}>Отменить</Button>}>
    {selection.error && <div className="form-alert form-alert--error" role="alert">{selection.error.message}</div>}
    <div className="geobase-deposit-picker">{deposits.map((deposit) => <button key={deposit.id} type="button" disabled={selection.isPending} aria-current={deposit.id === currentId ? 'true' : undefined}
      onClick={() => { if (deposit.id === currentId) onClose(); else selection.mutate(deposit.id) }}>
      <Mountain size={20} /><span><strong>{getDepositName(deposit, locale)}</strong><small>Месторождение № {deposit.code}</small></span>{deposit.id === currentId && <Check size={18} aria-label="Текущее месторождение" />}
    </button>)}</div>
  </WorkspaceDialog>
}

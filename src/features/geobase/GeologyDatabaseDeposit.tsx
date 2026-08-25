import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleAlert, Database, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { Deposit, UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { deleteDeposit, fetchGeologicalMasterData, updateDeposit } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { DeleteDepositDialog, DepositEditor } from './GeologyDatabaseRegistry'
import './geobase.css'

export function GeologyDatabaseDeposit({ depositId, onBack }: {
  depositId: string
  onBack: (replace?: boolean) => void
}) {
  const { persona } = useSession()
  const canEdit = hasPermission(persona, 'geology.well-master.edit')
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-master'] })
  const updateMutation = useMutation({
    mutationFn: ({ current, patch }: { current: Deposit; patch: UpdateDepositPatch }) => updateDeposit(current, patch),
    onSuccess: async (updated) => {
      await refresh()
      setNotice(`Изменения «${updated.name}» сохранены как версия ${updated.version}.`)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDeposit,
    onSuccess: async () => {
      await refresh()
      onBack(true)
    },
  })

  if (masterQuery.isLoading) return <div className="page-loading"><span /><p>Открываем карточку месторождения…</p></div>

  const data = masterQuery.data
  const deposit = data?.deposits.find((item) => item.id === depositId)
  const back = () => onBack()
  const currentError = masterQuery.error ?? updateMutation.error ?? deleteMutation.error

  if (!deposit || !data) {
    return <div className="page-stack geobase-page" data-geology-tour="bgd-detail">
      <PageHeader
        eyebrow="База геологических данных"
        title="Месторождение не найдено"
        description={`В базе геологических данных нет объекта ${depositId}. Возможно, он был удалён или ссылка устарела.`}
        actions={<Button variant="secondary" onClick={back}><ArrowLeft size={16} /> Вернуться в реестр</Button>}
      />
      {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}
      <Panel className="geobase-not-found" title="Карточка недоступна" description="Откройте реестр и выберите существующее месторождение.">
        <div className="geobase-empty"><Database size={22} /><strong>Объект не найден</strong><span>Фильтры реестра сохранены в адресе и восстановятся при возврате.</span></div>
      </Panel>
    </div>
  }

  const sites = data.sites.filter((item) => item.depositId === deposit.id)
  const siteIds = new Set(sites.map((item) => item.id))
  const dependencies = {
    sites: sites.length,
    lenses: data.lenses.filter((item) => siteIds.has(item.siteId)).length,
    conditions: data.conditionSets.filter((item) => siteIds.has(item.siteId)).length,
  }

  return <div className="page-stack geobase-page" data-geology-tour="bgd-detail">
    <PageHeader
      eyebrow="База геологических данных"
      title={deposit.name}
      description={`№ ${deposit.numericId} · ${deposit.code} · отдельная карточка корневого объекта БГД`}
      meta={<Badge tone={deposit.isHidden ? 'neutral' : 'success'} dot>{deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge>}
      actions={<Button variant="secondary" onClick={back}><ArrowLeft size={16} /> К реестру</Button>}
    />

    {!canEdit && <div className="form-alert"><ShieldCheck size={17} /><span>Карточка открыта только для чтения. Для изменения нужен доступ к управлению геологическими объектами.</span></div>}
    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}
    {notice && <div className="success-message" role="status"><ShieldCheck size={17} /><span><strong>БГД обновлена</strong>{notice}</span></div>}

    <DepositEditor
      key={`${deposit.id}-${deposit.version}`}
      deposit={deposit}
      canEdit={canEdit}
      pending={updateMutation.isPending || deleteMutation.isPending}
      dependencies={dependencies}
      onSave={(patch) => { setNotice(null); updateMutation.mutate({ current: deposit, patch }) }}
      onDelete={() => { setNotice(null); setDeleteOpen(true) }}
    />

    {deleteOpen && <DeleteDepositDialog
      deposit={deposit}
      dependencies={dependencies}
      pending={deleteMutation.isPending}
      error={deleteMutation.error?.message}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => deleteMutation.mutate(deposit)}
    />}
  </div>
}

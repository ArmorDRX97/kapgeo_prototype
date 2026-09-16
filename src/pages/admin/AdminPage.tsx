import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Building2, CheckCircle2, Database, Plus, ShieldCheck, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { getDepositName, type CreateDepositInput } from '../../entities/geology-master/model/types'
import { userPersonas } from '../../entities/session/model/personas'
import { useSession } from '../../entities/session/model/sessionContext'
import { CreateDepositDialog } from '../../features/geobase/GeologyDatabaseRegistry'
import { createDeposit, fetchGeologicalMasterData } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function AdminPage() {
  const { persona } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const [createOpen, setCreateOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const canCreateDeposit = hasPermission(persona, 'geology.bgd.create')
  const data = masterQuery.data
  const nextCode = Math.max(0, ...(data?.deposits.map((item) => item.code) ?? [])) + 1
  const createMutation = useMutation({
    mutationFn: (input: CreateDepositInput) => createDeposit(input),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['geology-master'] })
      setCreateOpen(false)
      setNotice(`Месторождение «${getDepositName(created)}» создано и доступно в геологическом модуле.`)
    },
  })

  return <div className="page-stack admin-page">
    <PageHeader
      eyebrow="Системный контур"
      title="Администрирование"
      description="Управление структурой прототипа, пользователями и корневыми объектами данных."
      actions={canCreateDeposit ? <Button className="admin-create-deposit" onClick={() => { setNotice(null); setCreateOpen(true) }}><Plus size={17} /> Создать месторождение</Button> : undefined}
    />
    {notice && <div className="success-message" role="status"><CheckCircle2 size={17} /><span><strong>Объект создан</strong>{notice}</span></div>}
    {!canCreateDeposit && <div className="form-alert"><ShieldCheck size={17} /><span>Эта административная роль может просматривать структуру, но создание месторождений ей не назначено.</span></div>}
    <section className="admin-stat-grid" aria-label="Сводка администрирования">
      <article><span><UsersRound size={20} /></span><div><strong>{userPersonas.length}</strong><small>демонстрационных ролей</small></div></article>
      <article><span><Building2 size={20} /></span><div><strong>{data?.deposits.length ?? '—'}</strong><small>месторождения в БГД</small></div></article>
      <article><span><Database size={20} /></span><div><strong>{(data?.sites.length ?? 0) + (data?.lenses.length ?? 0)}</strong><small>связанных объектов</small></div></article>
    </section>
    <div className="admin-grid">
      <Panel title="Управление месторождениями" description="Создание корневых объектов вынесено из ежедневной рабочей области геолога.">
        {masterQuery.isLoading ? <div className="skeleton skeleton--list" /> : <div className="admin-deposit-list">{data?.deposits.map((deposit) => <button key={deposit.id} type="button" onClick={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId: deposit.id } })}><span><strong>{getDepositName(deposit)}</strong><small>№ {deposit.code} · версия {deposit.version}</small></span><Badge tone={deposit.isHidden ? 'neutral' : 'success'} dot>{deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge></button>)}</div>}
        {canCreateDeposit && <Button className="admin-deposit-list__create" variant="secondary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Добавить месторождение</Button>}
      </Panel>
      <Panel title="Ролевые профили" description="Полный демонстрационный набор ролей восстановлен.">
        <div className="admin-role-list">{userPersonas.map((item) => <article key={item.id}><span className="avatar avatar--sm">{item.initials}</span><span><strong>{item.position}</strong><small>{item.name} · {item.roles.join(', ')}</small></span></article>)}</div>
      </Panel>
    </div>
    {createOpen && <CreateDepositDialog nextCode={nextCode} existingCodes={data?.deposits.map((item) => item.code) ?? []} pending={createMutation.isPending} error={createMutation.error?.message} onClose={() => setCreateOpen(false)} onSubmit={(input) => createMutation.mutate(input)} />}
  </div>
}

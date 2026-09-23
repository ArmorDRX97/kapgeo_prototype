import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CircleAlert, Database } from 'lucide-react'
import { useEffect } from 'react'
import { fetchGeologicalMasterData, fetchPlatformPreferences } from '../../repository/api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function GeoBasePage() {
  const navigate = useNavigate({ from: '/geology/bgd' })
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const deposits = (masterQuery.data?.deposits ?? []).filter((deposit) => !deposit.isHidden)
  const currentDeposit = deposits.find((deposit) => deposit.id === preferencesQuery.data?.currentDepositId) ?? deposits[0]
  const currentDepositId = currentDeposit?.id
  const isResolving = masterQuery.isLoading || preferencesQuery.isLoading

  useEffect(() => {
    if (isResolving || !currentDepositId) return
    void navigate({
      to: '/geology/bgd/$depositId',
      params: { depositId: currentDepositId },
      search: { section: undefined },
      replace: true,
    })
  }, [currentDepositId, isResolving, navigate])

  if (isResolving || currentDepositId) {
    return <div className="page-loading"><span /><p>Открываем основные сведения…</p></div>
  }

  const error = masterQuery.error ?? preferencesQuery.error

  return <div className="page-stack geobase-page">
    <PageHeader
      eyebrow="База геологических данных"
      title="Нет доступных месторождений"
      description="Для работы в БГД нужен хотя бы один доступный объект."
    />
    {error && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{error.message}</span></div>}
    <Panel title="Рабочий контекст не задан" description="Создать месторождение может администратор в модуле администрирования.">
      <div className="geobase-empty"><Database size={22} /><strong>Месторождений пока нет</strong><span>Обратитесь к администратору, чтобы он создал или открыл доступный объект.</span></div>
    </Panel>
  </div>
}

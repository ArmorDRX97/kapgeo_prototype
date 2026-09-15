import { ShieldCheck } from 'lucide-react'
import { useSession } from '../../entities/session/model/sessionContext'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

export function ProfilePage() {
  const { persona } = useSession()

  return <div className="page-stack">
    <PageHeader eyebrow="Профиль · PROF-01" title="Профиль" description="Учётная запись геолога и область доступа к базе геологических данных." />
    <div className="profile-grid">
      <Panel className="profile-card"><div className="profile-identity"><span>{persona?.initials}</span><div><h2>{persona?.name}</h2><p>{persona?.position}</p><Badge tone="success" dot>Активная сессия</Badge></div></div><dl><div><dt>Роль</dt><dd>{persona?.roles.join(', ')}</dd></div><div><dt>Область</dt><dd>{persona?.scope}</dd></div><div><dt>Учётная запись</dt><dd>{persona?.id}</dd></div></dl></Panel>
      <Panel title="Активный профиль" description="Профиль закреплён за рабочей областью БГД."><label className="field"><span className="field__label">Работать как</span><select value={persona?.id ?? ''} disabled><option value={persona?.id ?? ''}>{persona?.position} · {persona?.name}</option></select></label><div className="profile-notice"><ShieldCheck size={17} /><span>Доступ к данным и операциям определяется правами геолога и областью объекта.</span></div></Panel>
    </div>
  </div>
}

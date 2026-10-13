import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'

const statusLabels = { saved: 'Сохранено', dirty: 'Не сохранено', pending: 'Правки не применены', readonly: 'Только просмотр' }
export function SectionDocumentHeader({ section, status, actions, message }: { section: GeologySection; status: keyof typeof statusLabels; actions?: ReactNode; message?: string }) {
  const [infoOpen, setInfoOpen] = useState(false), title = section.title || 'Новый разрез'
  return <>
    <header className="section-workbench__header">
      <div className="section-document-identity">
        <h1 title={title}>{title}</h1><span className="section-document-id">{section.id}</span>
        <span className="section-document-status" data-state={status} role="status">{statusLabels[status]}</span>
        <Button variant="quiet" size="sm" aria-label="Сведения о разрезе" title="Сведения о разрезе" aria-haspopup="dialog" onClick={() => setInfoOpen(true)}><Info size={17} /></Button>
      </div><div className="section-document-global" role="group" aria-label="Действия со всем разрезом">
        {message && <span className="section-document-message" role="status" title={message}>{message}</span>}{actions}
      </div>
    </header>
    {infoOpen && <WorkspaceDialog title="Сведения о разрезе" size="compact" onClose={() => setInfoOpen(false)}><dl className="graphic-info section-document-info">
      {([['Название', title], ['ID', section.id], ['Месторождение', section.depositName], ['Состояние', statusLabels[status]], ['Скважин', String(section.wellIds.length)], ['Диапазон Z', `${section.bottom}…${section.top} м`]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      {message && <div><dt>Последнее действие</dt><dd>{message}</dd></div>}
    </dl></WorkspaceDialog>}
  </>
}

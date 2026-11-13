import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { SectionToolButton } from './SectionToolButton'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { WorkspaceToolbarGroup, WorkspaceToolbarStatus } from '../../../shared/ui/WorkspaceToolbar'

const statusLabels = { saved: 'Сохранено', dirty: 'Не сохранено', pending: 'Правки не применены', readonly: 'Только просмотр' }
export function SectionDocumentActions({ section, status, children, help, secondaryActions, message }: { section: GeologySection; status: keyof typeof statusLabels; children: ReactNode; help?: ReactNode; secondaryActions?: ReactNode; message?: string }) {
  const [infoOpen, setInfoOpen] = useState(false), title = section.title || 'Новый разрез'
  return <>
    <WorkspaceToolbarGroup label="Действия со всем разрезом">
      {children}
    </WorkspaceToolbarGroup>
    <WorkspaceToolbarGroup label="Состояние и справка" end>
      <WorkspaceToolbarStatus state={status} label={statusLabels[status]} />
      <SectionToolButton variant="quiet" icon={Info} label="Сведения о разрезе" aria-haspopup="dialog" onClick={() => setInfoOpen(true)} />
      {help}
      {message && <span className="workspace-toolbar-announcement" role="status">{message}</span>}
    </WorkspaceToolbarGroup>
    {infoOpen && <WorkspaceDialog title="Сведения о разрезе" size="compact" onClose={() => setInfoOpen(false)} footer={secondaryActions}><dl className="graphic-info section-document-info">
      {([['Название', title], ['ID', section.id], ['Месторождение', section.depositName], ['Состояние', statusLabels[status]], ['Скважин', String(section.wellIds.length)], ['Диапазон Z', `${section.bottom}…${section.top} м`]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      {message && <div><dt>Последнее действие</dt><dd>{message}</dd></div>}
    </dl></WorkspaceDialog>}
  </>
}

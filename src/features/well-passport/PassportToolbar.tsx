import { CircleHelp, Download, Info, Printer } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { Button } from '../../shared/ui/Button'
import { Tooltip } from '../../shared/ui/Tooltip'
import { WorkspaceToolbar, WorkspaceToolbarGroup, WorkspaceToolbarStatus } from '../../shared/ui/WorkspaceToolbar'

export function PassportIconButton({ label, children, onClick, disabled, pressed }: {
  label: string; children: ReactElement; onClick: () => void; disabled?: boolean; pressed?: boolean
}) {
  return <Tooltip content={label}><Button variant="quiet" size="sm" className="passport-icon-button" aria-label={label} disabled={disabled} aria-pressed={pressed} onClick={onClick}>{children}</Button></Tooltip>
}

export function PassportToolbar({ view, actions, registry, unsaved, onPrint, onExport, onInfo, onHelp, children }: {
  view: ReactNode; actions?: ReactNode; registry?: ReactNode; unsaved: boolean
  onPrint: () => void; onExport: () => void; onInfo: () => void; onHelp: () => void; children: ReactNode
}) {
  return <WorkspaceToolbar preferenceKey="kapgeo.passport.toolbar-dock" controls={<>
    {registry && <WorkspaceToolbarGroup label="Реестр скважин">{registry}</WorkspaceToolbarGroup>}
    <WorkspaceToolbarGroup label="Масштаб и вид паспорта">{view}</WorkspaceToolbarGroup>
    <WorkspaceToolbarGroup label="Действия с паспортом">
      {actions}
      <PassportIconButton label="Печать" onClick={onPrint}><Printer size={16} aria-hidden="true" /></PassportIconButton>
      <PassportIconButton label="Экспорт" onClick={onExport}><Download size={16} aria-hidden="true" /></PassportIconButton>
    </WorkspaceToolbarGroup>
    <WorkspaceToolbarGroup label="Состояние и справка" end>
      <WorkspaceToolbarStatus state={unsaved ? 'dirty' : 'saved'} label={unsaved ? 'Не сохранено' : 'Сохранено'} />
      <PassportIconButton label="Сведения о скважине" onClick={onInfo}><Info size={17} aria-hidden="true" /></PassportIconButton>
      <PassportIconButton label="Как работать с паспортом" onClick={onHelp}><CircleHelp size={17} aria-hidden="true" /></PassportIconButton>
    </WorkspaceToolbarGroup>
  </>}>{children}</WorkspaceToolbar>
}

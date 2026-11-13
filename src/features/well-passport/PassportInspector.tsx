import type { ReactNode } from 'react'
import { WorkspacePanelHeading } from '../../shared/ui/WorkspacePanelHeading'

export function PassportInspector({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: ReactNode }) {
  return <>
    {open && <button type="button" className="passport-pane-backdrop passport-settings-backdrop" aria-label="Закрыть настройки паспорта" onClick={onToggle} />}
    <aside className={`passport-inspector${open ? '' : ' is-collapsed'}`} aria-label="Оформление паспорта">
      <WorkspacePanelHeading title="Настройки паспорта" open={open} controls="passport-inspector" onToggle={onToggle} openLabel="Показать настройки паспорта" closeLabel="Скрыть настройки паспорта" />
      <div className="passport-inspector-body" id="passport-inspector" hidden={!open}>{children}</div>
    </aside>
  </>
}

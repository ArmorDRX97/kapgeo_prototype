import { useId, type ReactNode } from 'react'
import { Panel } from '../../shared/ui/Panel'

export function Example({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <Panel title={title} description={description} action={action} className="uik-example">{children}</Panel>
}
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className={`field${error ? ' uik-field-error' : ''}`}><span className="field__label">{label}</span>{children}{hint && <span className="field__hint">{hint}</span>}{error && <span className="field__error">{error}</span>}</label>
}
export function Caption({ children }: { children: ReactNode }) { return <p className="uik-caption">{children}</p> }
export function DemoTable({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return <div className="uik-table-scroll" tabIndex={0} role="region" aria-labelledby={id}><table className="uik-table"><caption id={id}>{label}</caption>{children}</table></div>
}
export type Notify = (message: string) => void

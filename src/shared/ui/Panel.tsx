import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { cx } from '../lib/cx'

type PanelProps = HTMLAttributes<HTMLElement> & {
  title?: string
  description?: string
  action?: ReactNode
}

export function Panel({ children, className, title, description, action, ...props }: PropsWithChildren<PanelProps>) {
  return (
    <section className={cx('panel', className)} {...props}>
      {(title || action) && (
        <header className="panel__header">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {description && <p className="panel__description">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

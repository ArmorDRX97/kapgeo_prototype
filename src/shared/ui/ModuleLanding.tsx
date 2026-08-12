import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from './PageHeader'
import { Panel } from './Panel'

export type ModuleAction = {
  title: string
  description: string
  meta: string
  to?: string
}

export function ModuleLanding({ eyebrow, title, description, icon: Icon, accent, actions }: { eyebrow: string; title: string; description: string; icon: LucideIcon; accent: string; actions: ModuleAction[] }) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={<span className="module-mark" style={{ background: accent }}><Icon size={18} aria-hidden="true" /></span>}
      />
      <div className="module-grid">
        {actions.map((action, index) => (
          <Panel key={action.title} className="module-action-card">
            <span className="module-action-card__index">{String(index + 1).padStart(2, '0')}</span>
            <h2>{action.title}</h2>
            <p>{action.description}</p>
            <div className="module-action-card__footer">
              <span>{action.meta}</span>
              {action.to ? (
                <Link to={action.to} className="text-link">Открыть <ArrowRight size={15} aria-hidden="true" /></Link>
              ) : (
                <span className="badge badge--neutral">Следующий срез</span>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

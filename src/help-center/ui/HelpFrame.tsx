import { BookOpenCheck, Boxes, GitPullRequestArrow, Home, SearchCheck, UsersRound } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import '../help-center.css'

const navigation = [
  { href: '/help', label: 'Обзор', icon: Home },
  { href: '/help/start', label: 'С чего начать', icon: BookOpenCheck },
  { href: '/help/roles', label: 'Роли', icon: UsersRound },
  { href: '/help/modules', label: 'Разделы системы', icon: Boxes },
  { href: '/help/flows', label: 'Сквозные процессы', icon: GitPullRequestArrow },
  { href: '/help/verification', label: 'Что проверено', icon: SearchCheck },
]

export function HelpFrame({ title, description, eyebrow, actions, children }: PropsWithChildren<{ title: string; description: string; eyebrow?: string; actions?: ReactNode }>) {
  return (
    <div className="help-center">
      <header className="help-hero">
        <div>
          <p>{eyebrow ?? 'Справочный центр AI KAPGEO'}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
        {actions && <div className="help-hero__actions">{actions}</div>}
      </header>
      <nav className="help-nav" aria-label="Разделы справочного центра">
        {navigation.map(({ href, label, icon: Icon }) => <a href={href} key={href}><Icon size={16} /><span>{label}</span></a>)}
      </nav>
      <div className="help-content">{children}</div>
    </div>
  )
}

export function GuideLink({ href, children, subtle = false }: PropsWithChildren<{ href: string; subtle?: boolean }>) {
  return <a className={subtle ? 'help-link help-link--subtle' : 'help-link'} href={href}>{children}<span aria-hidden="true">→</span></a>
}

export function HelpBreadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className="help-breadcrumbs" aria-label="Хлебные крошки">{items.map((item, index) => <span key={`${item.label}-${index}`}>{item.href ? <a href={item.href}>{item.label}</a> : item.label}{index < items.length - 1 && <i>/</i>}</span>)}</nav>
}

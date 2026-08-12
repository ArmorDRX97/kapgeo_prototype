import { ArrowRight, CheckCircle2, ExternalLink, UsersRound } from 'lucide-react'
import type { GuideStep } from '../model/types'
import { GuideLink } from './HelpFrame'

export function StepList({ steps }: { steps: GuideStep[] }) {
  return <ol className="guide-steps">{steps.map((step, index) => <li key={`${step.title}-${index}`}><span className="guide-steps__number">{index + 1}</span><div><div className="guide-steps__heading"><h3>{step.title}</h3>{step.taskId && <a className="guide-task" href={step.href}>{step.taskId}</a>}</div><p>{step.description}</p><div className="guide-steps__result"><CheckCircle2 size={15} /><span><strong>Результат:</strong> {step.result}</span></div><GuideLink href={step.href}>{step.linkLabel}</GuideLink></div></li>)}</ol>
}

export function ScreenList({ screens }: { screens: Array<{ name: string; href: string; purpose: string; actions: string[]; roles: string[] }> }) {
  return <div className="guide-screen-list">{screens.map((screen) => <article key={`${screen.href}-${screen.name}`}><div><h3>{screen.name}</h3><p>{screen.purpose}</p></div><dl><div><dt>Что можно сделать</dt><dd>{screen.actions.join(' · ')}</dd></div><div><dt>Основные роли</dt><dd>{screen.roles.join(', ')}</dd></div></dl><a href={screen.href}>Открыть страницу <ExternalLink size={14} /></a></article>)}</div>
}

export function CollaborationList({ items }: { items: Array<{ role: string; reason: string }> }) {
  return <div className="collaboration-list">{items.map((item) => <div key={item.role}><UsersRound size={17} /><span><strong>{item.role}</strong><small>{item.reason}</small></span><ArrowRight size={15} /></div>)}</div>
}

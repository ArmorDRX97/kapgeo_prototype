import { flowGuides } from '../data/flows'
import { StepList } from '../ui/GuideBlocks'
import { HelpBreadcrumbs, HelpFrame } from '../ui/HelpFrame'

export function HelpFlowsPage() {
  return <HelpFrame eyebrow="Сквозные процессы" title="Как роли передают работу друг другу" description="Последовательности от первичного ввода до проверки, расчёта, публикации и управленческого решения.">
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'Сквозные процессы' }]} />
    <div className="flow-guide-list">{flowGuides.map((flow) => <section key={flow.id} id={flow.id}><header><div><p>{flow.actors.join(' → ')}</p><h2>{flow.title}</h2><span>{flow.summary}</span></div></header><StepList steps={flow.steps} /></section>)}</div>
  </HelpFrame>
}

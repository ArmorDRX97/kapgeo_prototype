import { useParams } from '@tanstack/react-router'
import { moduleGuides, moduleGuideById } from '../data/modules'
import { ScreenList } from '../ui/GuideBlocks'
import { HelpBreadcrumbs, HelpFrame, GuideLink, HelpRouteLink } from '../ui/HelpFrame'

export function HelpModulesPage() {
  return <HelpFrame eyebrow="Каталог интерфейса" title="Разделы и страницы системы" description="Что находится на каждом экране, кто им пользуется и какие действия действительно работают.">
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'Разделы системы' }]} />
    <div className="module-guide-grid">{moduleGuides.map((module) => <HelpRouteLink href={`/help/modules/${module.id}`} key={module.id}><span>{module.code}</span><h2>{module.name}</h2><p>{module.summary}</p><small>{module.screens.length} страниц и рабочих областей</small></HelpRouteLink>)}</div>
  </HelpFrame>
}

export function HelpModulePage() {
  const { moduleId } = useParams({ strict: false })
  const module = moduleGuideById[moduleId ?? '']
  if (!module) return <HelpFrame title="Раздел не найден" description="Вернитесь в каталог и выберите существующий раздел."><GuideLink href="/help/modules">К каталогу</GuideLink></HelpFrame>
  return <HelpFrame eyebrow={module.code} title={module.name} description={module.summary} actions={<GuideLink href={module.entryHref}>Открыть раздел</GuideLink>}>
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'Разделы системы', href: '/help/modules' }, { label: module.name }]} />
    <section className="module-audience"><span>Основные пользователи</span><strong>{module.audience.join(' · ')}</strong></section>
    <section className="help-section"><div className="help-section__heading"><div><p>{module.screens.length} экранов</p><h2>Что делает каждая страница</h2></div></div><ScreenList screens={module.screens} /></section>
  </HelpFrame>
}

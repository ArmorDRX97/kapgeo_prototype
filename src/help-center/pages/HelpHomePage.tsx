import { BookOpenCheck, Boxes, GitPullRequestArrow, Search, ShieldCheck, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { moduleGuides } from '../data/modules'
import { roleGuides } from '../data/roles'
import { HelpFrame, GuideLink } from '../ui/HelpFrame'

export function HelpHomePage() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    return [
      ...roleGuides.flatMap((role) => [
        { title: `${role.id} · ${role.name}`, detail: role.summary, href: `/help/roles/${role.id}` },
        ...role.steps.map((step) => ({ title: `${step.taskId ? `${step.taskId} · ` : ''}${step.title}`, detail: `${role.id} ${role.name} · ${step.description}`, href: step.href })),
      ]),
      ...moduleGuides.flatMap((module) => [
        { title: module.name, detail: module.summary, href: `/help/modules/${module.id}` },
        ...module.screens.map((screen) => ({ title: screen.name, detail: `${module.name} · ${screen.purpose}`, href: screen.href })),
      ]),
    ].filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(normalized)).slice(0, 12)
  }, [query])

  return <HelpFrame title="Как работать в AI KAPGEO" description="Самодостаточное руководство по входу, ролям, разделам, действиям и передаче результата между специалистами.">
    <section className="help-search-section" aria-label="Поиск по руководству">
      <label><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Роль, страница, действие или код задачи…" /></label>
      {query && <div className="help-search-results">{results.length ? results.map((item) => <a href={item.href} key={`${item.href}-${item.title}`}><strong>{item.title}</strong><span>{item.detail}</span></a>) : <p>Совпадений не найдено. Попробуйте название роли, модуля или объекта.</p>}</div>}
    </section>

    <section className="help-start-grid">
      <article className="help-start-card help-start-card--primary"><BookOpenCheck size={23} /><div><span>Первый визит</span><h2>Начните отсюда</h2><p>Вход, выбор профиля, второй фактор, интерфейс и безопасный первый маршрут.</p><GuideLink href="/help/start">Открыть быстрый старт</GuideLink></div></article>
      <article className="help-start-card"><UsersRound size={23} /><div><span>14 ролей</span><h2>Моя роль</h2><p>Обязанности, последовательность действий и передача результата коллегам.</p><GuideLink href="/help/roles">Выбрать роль</GuideLink></div></article>
      <article className="help-start-card"><Boxes size={23} /><div><span>Все экраны</span><h2>Разделы системы</h2><p>Назначение каждой страницы, доступные действия и прямые ссылки.</p><GuideLink href="/help/modules">Открыть каталог</GuideLink></div></article>
      <article className="help-start-card"><GitPullRequestArrow size={23} /><div><span>Между ролями</span><h2>Сквозные процессы</h2><p>Как данные проходят от ввода и проверки до модели, аналитики и решения.</p><GuideLink href="/help/flows">Открыть процессы</GuideLink></div></article>
    </section>

    <section className="help-section">
      <div className="help-section__heading"><div><p>Рабочие профили</p><h2>Выберите свою роль</h2></div><GuideLink href="/help/roles" subtle>Все роли</GuideLink></div>
      <div className="role-card-grid">{roleGuides.map((role) => <a href={`/help/roles/${role.id}`} key={role.id}><span>{role.id}</span><strong>{role.name}</strong><small>{role.person}</small></a>)}</div>
    </section>

    <aside className="help-confidence"><ShieldCheck size={21} /><div><strong>Руководство основано на работающем интерфейсе</strong><p>Перед публикацией проверены вход, навигация всех ролей, данные на рабочих страницах и ключевые действия модулей.</p></div><GuideLink href="/help/verification">Что именно проверено</GuideLink></aside>
  </HelpFrame>
}

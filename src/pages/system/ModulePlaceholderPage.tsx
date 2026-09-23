import { Link } from '@tanstack/react-router'
import { BarChart3, Boxes, Construction, Mountain, Network, ShieldX } from 'lucide-react'
import { useSession } from '../../entities/session/model/sessionContext'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'

type ModulePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
  icon: typeof Network
  accent: string
}

function ModulePlaceholder({ eyebrow, title, description, icon: Icon, accent }: ModulePlaceholderProps) {
  return <div className="page-stack module-placeholder">
    <PageHeader eyebrow={eyebrow} title={title} description={description} />
    <section className="module-placeholder__hero" style={{ '--module-accent': accent } as React.CSSProperties}>
      <span className="module-placeholder__icon"><Icon size={34} /></span>
      <div><span className="module-placeholder__status"><Construction size={15} /> Каркас модуля</span><h2>Рабочая область готова к развитию</h2><p>Навигация и разграничение доступа уже подключены. Содержательные процессы будут добавляться отдельными вертикальными сценариями без перестройки общего интерфейса.</p></div>
    </section>
  </div>
}

export function TechnologyModulePage() {
  return <ModulePlaceholder eyebrow="Производственный контур" title="Технология" description="Технологические процессы, режимы эксплуатации и оперативная работа с производственными объектами." icon={Network} accent="#0f766e" />
}

export function GeologyModulePage() {
  return <ModulePlaceholder eyebrow="Геологический контур" title="Геология" description="Интерпретация геологических данных, разрезы, ресурсы и профильные процессы будут развиваться как самостоятельный модуль рядом с БГД." icon={Mountain} accent="#0f766e" />
}

export function ModelingModulePage() {
  return <ModulePlaceholder eyebrow="Расчётный контур" title="Моделирование" description="Геотехнологические модели, сценарии расчёта и подготовка согласованных вариантов." icon={Boxes} accent="#2767a8" />
}

export function AnalyticsModulePage() {
  return <ModulePlaceholder eyebrow="Аналитический контур" title="Аналитика" description="Сводные показатели, отчётность и контроль качества данных для принятия решений." icon={BarChart3} accent="#6d4bb1" />
}

export function AccessDeniedPage({ moduleName }: { moduleName: string }) {
  const { persona } = useSession()
  return <main className="state-page"><span className="state-page__icon state-page__icon--danger"><ShieldX size={30} /></span><p className="eyebrow">Доступ ограничен</p><h1>Модуль «{moduleName}» недоступен</h1><p>Для профиля «{persona?.position}» не назначено разрешение на этот раздел. Сменить демонстрационную роль можно в профиле.</p><div><Link to="/profile" className="button button--primary button--md">Открыть профиль</Link><Button variant="secondary" onClick={() => window.history.back()}>Назад</Button></div></main>
}

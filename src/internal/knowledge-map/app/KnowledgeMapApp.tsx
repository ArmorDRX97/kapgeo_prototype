import { Component, Suspense, lazy, type ReactNode } from 'react'
import { announceKnowledgeError } from '../integration/frameBridge'

const KnowledgeMapPage = lazy(() => import('../pages/KnowledgeMapPage'))
class KnowledgeErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null }
  static getDerivedStateFromError(error: unknown) { return { error: error instanceof Error ? error.message : 'Неизвестная ошибка карты' } }
  componentDidCatch() { announceKnowledgeError() }
  render() {
    if (this.state.error) return <div className="startup-state" role="alert"><span className="startup-logo">K</span><h1>Карту не удалось открыть</h1><p>Данные или ресурсы приложения не прошли загрузку. Повторите попытку; если ошибка сохраняется, передайте описание разработчику.</p><details><summary>Описание ошибки</summary><pre>{this.state.error}</pre></details><button className="button primary" onClick={() => window.location.reload()}>Попробовать снова</button></div>
    return this.props.children
  }
}
export function KnowledgeMapApp() {
  return <KnowledgeErrorBoundary><Suspense fallback={<div className="startup-state" role="status"><span className="startup-logo">K</span><h1>Открываем атлас KAPGEO</h1><p>Подготавливаем понятия, процессы и связи…</p></div>}><KnowledgeMapPage /></Suspense></KnowledgeErrorBoundary>
}

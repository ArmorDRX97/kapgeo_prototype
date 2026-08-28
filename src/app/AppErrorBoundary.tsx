import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { resetDemoData } from '../repository/demo/demoDataControl'

type ErrorBoundaryState = {
  error: Error | null
  isResetting: boolean
  resetError: string | null
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, isResetting: false, resetError: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application render error', error, errorInfo)
  }

  private reload = () => window.location.reload()

  private resetAndReload = async () => {
    this.setState({ isResetting: true, resetError: null })
    try {
      await resetDemoData()
      window.location.reload()
    } catch {
      this.setState({ isResetting: false, resetError: 'Не удалось очистить локальные данные. Закройте другие вкладки системы и повторите попытку.' })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return <main className="application-error" role="alert">
      <span className="application-error__icon"><CircleAlert size={26} /></span>
      <p>Ошибка загрузки</p>
      <h1>Не удалось открыть систему</h1>
      <span>Перезагрузите страницу. Если ошибка повторится, сбросьте заполненные и изменённые данные — будут восстановлены исходные значения.</span>
      {this.state.resetError && <small>{this.state.resetError}</small>}
      <div>
        <button type="button" className="button button--secondary button--md" onClick={this.reload} disabled={this.state.isResetting}>Перезагрузить</button>
        <button type="button" className="button button--primary button--md" onClick={() => void this.resetAndReload()} disabled={this.state.isResetting}><RotateCcw size={16} />{this.state.isResetting ? 'Сбрасываем…' : 'Сбросить демо данные'}</button>
      </div>
    </main>
  }
}

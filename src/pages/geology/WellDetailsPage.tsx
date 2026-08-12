import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { Activity, ArrowLeft, Bot, ChevronRight, CircleGauge, ClipboardCheck, Construction, FileText, FlaskConical, History, MapPin, MoreHorizontal, RadioTower, Ruler, Wrench, type LucideIcon } from 'lucide-react'
import { fetchWell } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { DrillingCoreWorkspace } from './components/DrillingCoreWorkspace'
import { LithologyWorkspace } from './components/LithologyWorkspace'
import { SamplesWorkspace } from './components/SamplesWorkspace'
import { LogsWorkspace } from './components/LogsWorkspace'
import { WellPassportWorkspace } from './components/WellPassportWorkspace'
import type { WellTabKey } from './wellTabSearch'

const tabs: Array<{ key: WellTabKey; label: string }> = [
  { key: 'overview', label: 'Обзор' },
  { key: 'passport', label: 'Паспорт' },
  { key: 'drilling', label: 'Бурение и керн' },
  { key: 'lithology', label: 'Литология' },
  { key: 'logs', label: 'ГИС' },
  { key: 'samples', label: 'Пробы' },
  { key: 'technology', label: 'Технология' },
  { key: 'equipment', label: 'Оборудование' },
  { key: 'model', label: 'Модель' },
  { key: 'documents', label: 'Документы' },
  { key: 'audit', label: 'Аудит' },
]

const wellRoute = getRouteApi('/objects/wells/$wellId')

type DomainStatusItem = [LucideIcon, string, string | number, 'success' | 'warning' | 'info' | 'ai' | 'neutral']

const wellStatusTone = {
  'Работает': 'success',
  'На проверке': 'info',
  'Отключена': 'neutral',
  'Требует внимания': 'warning',
} as const

export function WellDetailsPage() {
  const params = wellRoute.useParams()
  const search = wellRoute.useSearch()
  const navigate = useNavigate({ from: '/objects/wells/$wellId' })
  const { data: well, isLoading } = useQuery({ queryKey: ['well', params.wellId], queryFn: () => fetchWell(params.wellId) })
  const activeTab = search.tab ?? 'overview'

  if (isLoading || !well) return <div className="page-loading"><span /><p>Загружаем карточку скважины…</p></div>
  const isNewObjectDraft = well.version === 1 && well.updatedAt === 'Только что'
  const isWorkingDraft = well.status === 'На проверке'

  return (
    <div className="page-stack">
      <Link to="/geology/wells" className="back-link"><ArrowLeft size={16} /> К реестру скважин</Link>
      <header className="object-header">
        <div className="object-header__main">
          <span className="object-header__icon"><RadioTower size={25} /></span>
          <div><div className="object-header__title"><h1>{well.code}</h1><Badge tone={wellStatusTone[well.status]} dot>{well.status}</Badge><Badge tone="neutral">Версия {well.version ?? (isNewObjectDraft ? '1' : '7')}</Badge></div><p>{well.type} · {well.site} / {well.block} / {well.cell}</p></div>
        </div>
        <div className="object-header__actions"><Button variant="secondary"><History size={16} /> Версии</Button><Button>{isWorkingDraft ? 'Редактировать черновик' : 'Создать новую версию'}</Button><Button variant="quiet" aria-label="Другие действия"><MoreHorizontal size={18} /></Button></div>
        <dl className="object-header__facts">
          <div><dt><MapPin size={14} /> Координаты</dt><dd>{well.coordinates.x.toLocaleString('ru-RU')} · {well.coordinates.y.toLocaleString('ru-RU')}</dd></div>
          <div><dt><Ruler size={14} /> Глубина</dt><dd>{well.depth.toLocaleString('ru-RU')} м</dd></div>
          <div><dt><CircleGauge size={14} /> Полнота</dt><dd>{well.completeness}%</dd></div>
          <div><dt><Activity size={14} /> Обновлено</dt><dd>{well.updatedAt}</dd></div>
        </dl>
      </header>

      <nav className="object-tabs" aria-label="Разделы карточки">
        {tabs.map((tab) => <button key={tab.key} type="button" className={activeTab === tab.key ? 'is-active' : ''} onClick={() => void navigate({ search: { tab: tab.key === 'overview' ? undefined : tab.key }, replace: true })}>{tab.label}{tab.key === 'logs' && well.aiConflicts > 0 && <span>{well.aiConflicts}</span>}</button>)}
      </nav>

      {activeTab === 'overview' && <div className="object-content-grid">
        <div className="object-content-grid__main">
          <Panel title="Состояние данных" description="Опубликованные и рабочие данные по выбранной версии">
            <div className="domain-status-grid">
              {([
                [Construction, 'Паспорт и конструкция', isNewObjectDraft ? 'Черновик 68%' : 'Заполнено', isNewObjectDraft ? 'info' : 'success'],
                [RadioTower, 'ГИС и интерпретация', isNewObjectDraft ? 'Нет данных' : well.aiConflicts ? '1 расхождение' : 'Проверено', isNewObjectDraft ? 'neutral' : well.aiConflicts ? 'ai' : 'success'],
                [FlaskConical, 'Пробы и лаборатория', isNewObjectDraft ? 'Нет данных' : '24 результата', isNewObjectDraft ? 'neutral' : 'info'],
                [Wrench, 'Технологический режим', isNewObjectDraft ? 'Не назначен' : 'Работает', isNewObjectDraft ? 'neutral' : 'success'],
                [FileText, 'Документы', isNewObjectDraft ? 'Нет документов' : '1 ожидается', isNewObjectDraft ? 'neutral' : 'warning'],
                [ClipboardCheck, 'Качество данных', well.quality, 'warning'],
              ] satisfies DomainStatusItem[]).map(([Icon, title, value, tone]) => (
                <article key={title}><span className="domain-status-grid__icon"><Icon size={18} /></span><div><strong>{title}</strong><small>Версия согласована с карточкой</small></div><Badge tone={tone}>{String(value)}</Badge><ChevronRight size={16} /></article>
              ))}
            </div>
          </Panel>

          <Panel title="Геологический профиль" description="Сводное представление по глубине">
            {isNewObjectDraft ? <div className="empty-result draft-profile-empty"><RadioTower size={25} /><strong>Геологический профиль ещё не сформирован</strong><span>Добавьте рейсы бурения, интервалы и первичные материалы в текущий черновик.</span></div> : <div className="depth-preview">
              <div className="depth-preview__scale"><span>0</span><span>150</span><span>300</span><span>450</span><span>612 м</span></div>
              <div className="depth-preview__track depth-preview__track--lithology"><i /><i /><i /><i /></div>
              <div className="depth-preview__curve"><svg viewBox="0 0 130 500" preserveAspectRatio="none"><path d="M64 0 C28 45, 94 82, 52 126 S93 213, 41 258 S96 345, 61 388 S85 455, 49 500" /></svg></div>
              <div className="depth-preview__interval"><span style={{ top: '47%', height: '17%' }}>Рудный интервал<br /><strong>288,4–391,2 м</strong></span></div>
              <div className="depth-preview__legend"><span>Литология</span><span>Гамма-каротаж</span><span>Интерпретация</span></div>
            </div>}
          </Panel>
        </div>

        <aside className="object-content-grid__aside">
          <Panel title="Требуется действие">
            {well.aiConflicts > 0 ? <div className="action-callout action-callout--ai"><Bot size={21} /><div><Badge tone="ai">AI · SCN-01</Badge><strong>Расхождение границы интервала</strong><p>Ручная и AI-интерпретации отличаются на 4,8 м. Требуется экспертное решение.</p><Link to="/geology/interpretations/$interpretationId/compare" params={{ interpretationId: 'INT-WELL-1042-07' }} className="button button--primary button--md">Сравнить варианты <ChevronRight size={16} /></Link></div></div> : <div className="draft-next-step"><Construction size={21} /><div><Badge tone="info">DRAFT · GEO-06</Badge><strong>Заполните паспорт и конструкцию</strong><p>Проверьте координаты, добавьте интервалы колонны и приложите первичные документы перед отправкой на QC.</p><Button>Продолжить заполнение <ChevronRight size={16} /></Button></div></div>}
          </Panel>
          <Panel title="Связанные объекты">
            <div className="related-list"><button type="button"><span>Блок</span><strong>{well.block}</strong><ChevronRight size={15} /></button><button type="button"><span>Модель</span><strong>MODEL-NORTH-BASE</strong><ChevronRight size={15} /></button><button type="button"><span>Набор ГИС</span><strong>LOG-{well.code}-0418</strong><ChevronRight size={15} /></button></div>
          </Panel>
        </aside>
      </div>}
      {activeTab === 'passport' && <WellPassportWorkspace well={well} />}
      {activeTab === 'drilling' && <DrillingCoreWorkspace well={well} />}
      {activeTab === 'lithology' && <LithologyWorkspace well={well} />}
      {activeTab === 'samples' && <SamplesWorkspace well={well} />}
      {activeTab === 'logs' && <LogsWorkspace well={well} />}
      {!['overview', 'passport', 'drilling', 'lithology', 'samples', 'logs'].includes(activeTab) && <PlannedWellWorkspace tab={tabs.find((tab) => tab.key === activeTab)?.label ?? activeTab} />}
    </div>
  )
}

function PlannedWellWorkspace({ tab }: { tab: string }) {
  return <Panel className="planned-workspace"><span className="planned-workspace__icon"><Construction size={24} /></span><p className="eyebrow">Следующий вертикальный срез</p><h2>{tab}</h2><p>Маршрут вкладки уже стабилен и доступен по ссылке. Предметный редактор будет подключён согласно задачнику без подмены готового функционала декоративными данными.</p></Panel>
}

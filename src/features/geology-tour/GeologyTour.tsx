import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, Clock3, Compass, Map, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GeologyTourProgress } from '../../entities/geology-tour/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchGeologyTourProgress, saveGeologyTourProgress } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { geologyTourDefinitionById, geologyTourDefinitions } from './model/catalog'
import { buildCurrentGeologyPageTour, clearRuntimeTargets, resolveTourTarget } from './model/runtime'
import type { GeologyTourDefinition } from './model/types'
import './geology-tour.css'

type StoredProgress = Omit<GeologyTourProgress, 'id' | 'personaId' | 'updatedAt'>

type Highlight = {
  element: HTMLElement
  rect: DOMRect
  fallback: boolean
}

function routeParts(route: string) {
  const url = new URL(route, 'https://kapgeo.local')
  return { pathname: url.pathname, search: Object.fromEntries(url.searchParams.entries()) }
}

function routeMatches(route: string, pathname: string, search: Record<string, unknown>) {
  const expected = routeParts(route)
  if (expected.pathname !== pathname) return false
  return Object.entries(expected.search).every(([key, value]) => String(search[key] ?? '') === value)
    && (expected.pathname !== '/objects/wells/WELL-1042' || expected.search.tab || !search.tab)
}

function progressDraft(progress: GeologyTourProgress): StoredProgress {
  return {
    activeTourId: progress.activeTourId,
    stepIndex: progress.stepIndex,
    lastRoute: progress.lastRoute,
    completedTourIds: progress.completedTourIds,
    launcherSeen: progress.launcherSeen,
  }
}

function defaultDraft(): StoredProgress {
  return { stepIndex: 0, completedTourIds: [], launcherSeen: false }
}

function tooltipPosition(rect: DOMRect) {
  const width = Math.min(380, window.innerWidth - 24)
  if (window.innerWidth < 720) return { left: 12, bottom: 12, width }
  const gap = 16
  const estimatedHeight = Math.min(360, window.innerHeight - 24)
  const maxTop = Math.max(12, window.innerHeight - estimatedHeight - 12)
  const top = Math.min(Math.max(12, rect.top), maxTop)
  if (rect.right + gap + width <= window.innerWidth - 12) return { left: rect.right + gap, top, width }
  if (rect.left - gap - width >= 12) return { left: rect.left - gap - width, top, width }
  if (rect.bottom + gap + 250 <= window.innerHeight) return { left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12), top: rect.bottom + gap, width }
  return { left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12), top: Math.min(Math.max(12, rect.top - estimatedHeight - gap), maxTop), width }
}

export function GeologyTour() {
  const { persona } = useSession()
  const canViewGeology = hasPermission(persona, 'geology.view')
  const location = useRouterState({ select: (state) => state.location })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progressQuery = useQuery({
    queryKey: ['geology-tour-progress', persona?.id],
    queryFn: () => fetchGeologyTourProgress(persona!.id),
    enabled: Boolean(persona && canViewGeology),
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTour, setActiveTour] = useState<GeologyTourDefinition | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  const [targetLoading, setTargetLoading] = useState(false)
  const [completionNotice, setCompletionNotice] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<StoredProgress>(defaultDraft())
  const persistenceQueue = useRef<Promise<unknown>>(Promise.resolve())
  const currentSearch = location.search as Record<string, unknown>
  const currentRoute = `${location.pathname}${location.searchStr ?? ''}`

  useEffect(() => {
    if (progressQuery.data) progressRef.current = progressDraft(progressQuery.data)
  }, [progressQuery.data])

  const persist = useCallback((patch: Partial<StoredProgress>) => {
    if (!persona) return
    const next = { ...progressRef.current, ...patch }
    progressRef.current = next
    queryClient.setQueryData<GeologyTourProgress>(['geology-tour-progress', persona.id], (current) => current ? { ...current, ...next } : current)
    persistenceQueue.current = persistenceQueue.current
      .then(() => saveGeologyTourProgress(persona.id, next))
      .then((saved) => {
        progressRef.current = progressDraft(saved)
        queryClient.setQueryData(['geology-tour-progress', persona.id], saved)
      })
      .catch(() => undefined)
  }, [persona, queryClient])

  const startTour = useCallback((tour: GeologyTourDefinition, index = 0) => {
    const safeIndex = Math.min(Math.max(index, 0), Math.max(0, tour.steps.length - 1))
    setCompletionNotice(null)
    setMenuOpen(false)
    setHighlight(null)
    setTargetLoading(true)
    setActiveTour(tour)
    setStepIndex(safeIndex)
    if (geologyTourDefinitionById.has(tour.id)) {
      persist({ activeTourId: tour.id, stepIndex: safeIndex, lastRoute: tour.steps[safeIndex]?.route, launcherSeen: true })
    } else {
      persist({ launcherSeen: true })
    }
  }, [persist])

  const pauseTour = useCallback(() => {
    if (activeTour && geologyTourDefinitionById.has(activeTour.id)) {
      persist({ activeTourId: activeTour.id, stepIndex, lastRoute: activeTour.steps[stepIndex]?.route })
    }
    clearRuntimeTargets()
    setActiveTour(null)
    setHighlight(null)
    setMenuOpen(true)
  }, [activeTour, persist, stepIndex])

  const finishTour = useCallback(() => {
    if (!activeTour) return
    const completed = geologyTourDefinitionById.has(activeTour.id)
      ? [...new Set([...progressRef.current.completedTourIds, activeTour.id])]
      : progressRef.current.completedTourIds
    persist({ activeTourId: undefined, stepIndex: 0, lastRoute: undefined, completedTourIds: completed })
    clearRuntimeTargets()
    setCompletionNotice(`Экскурсия «${activeTour.title}» завершена.`)
    setActiveTour(null)
    setHighlight(null)
    setMenuOpen(true)
  }, [activeTour, persist])

  const resetProgress = useCallback(() => {
    persist({ activeTourId: undefined, stepIndex: 0, lastRoute: undefined, completedTourIds: [], launcherSeen: true })
    setCompletionNotice('Прогресс обучения сброшен. Любую экскурсию можно начать заново.')
  }, [persist])
  const moveTo = useCallback((nextIndex: number) => {
    if (!activeTour) return
    if (nextIndex >= activeTour.steps.length) {
      finishTour()
      return
    }
    const safeIndex = Math.max(0, nextIndex)
    setHighlight(null)
    setTargetLoading(true)
    setStepIndex(safeIndex)
    if (geologyTourDefinitionById.has(activeTour.id)) {
      persist({ activeTourId: activeTour.id, stepIndex: safeIndex, lastRoute: activeTour.steps[safeIndex]?.route })
    }
  }, [activeTour, finishTour, persist])

  const activeStep = activeTour?.steps[stepIndex]

  useEffect(() => {
    if (!activeStep) return
    if (routeMatches(activeStep.route, location.pathname, currentSearch)) return
    const expected = routeParts(activeStep.route)
    void navigate({ to: expected.pathname as never, search: expected.search as never, replace: true })
  }, [activeStep, currentSearch, location.pathname, navigate])

  useEffect(() => {
    if (!activeStep || !routeMatches(activeStep.route, location.pathname, currentSearch)) return
    let cancelled = false
    let timer = 0
    let attempts = 0
    const find = () => {
      if (cancelled) return
      const exact = resolveTourTarget(activeStep)
      const element = exact ?? document.querySelector<HTMLElement>('#main-content')
      if (exact || attempts >= 50) {
        if (!element) return
        element.scrollIntoView({ block: exact ? 'center' : 'start', inline: 'nearest', behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth' })
        window.setTimeout(() => {
          if (cancelled) return
          setHighlight({ element, rect: element.getBoundingClientRect(), fallback: !exact })
          setTargetLoading(false)
        }, 220)
        return
      }
      attempts += 1
      timer = window.setTimeout(find, 80)
    }
    find()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeStep, currentSearch, location.pathname])

  const highlightElement = highlight?.element

  useEffect(() => {
    if (!highlightElement) return
    const update = () => setHighlight((current) => current ? { ...current, rect: highlightElement.getBoundingClientRect() } : current)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(highlightElement)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [highlightElement])

  useEffect(() => {
    if (!activeTour) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') pauseTour()
      if (event.key === 'Tab' && tooltipRef.current) {
        const focusable = [...tooltipRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
        const first = focusable[0]
        const last = focusable.at(-1)
        if (first && last && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (first && last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
      if (event.key === 'ArrowRight' && !event.altKey && !event.metaKey && !event.ctrlKey) moveTo(stepIndex + 1)
      if (event.key === 'ArrowLeft' && stepIndex > 0 && !event.altKey && !event.metaKey && !event.ctrlKey) moveTo(stepIndex - 1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeTour, moveTo, pauseTour, stepIndex])

  useEffect(() => {
    if (highlight) tooltipRef.current?.focus()
  }, [highlight, stepIndex])

  useEffect(() => () => clearRuntimeTargets(), [])

  const resumeTour = useMemo(() => {
    const id = progressQuery.data?.activeTourId
    return id ? geologyTourDefinitionById.get(id) : undefined
  }, [progressQuery.data?.activeTourId])

  if (!persona || !canViewGeology) return null

  const openMenu = () => {
    setMenuOpen((value) => !value)
    if (!progressQuery.data?.launcherSeen) persist({ launcherSeen: true })
  }

  const startCurrentPage = () => {
    const tour = buildCurrentGeologyPageTour(currentRoute)
    if (tour) startTour(tour)
  }

  const launcher = !activeTour && (
    <>
      {menuOpen && <section className="geology-tour-menu" aria-label="Обучение по геологическому модулю">
        <header><span className="geology-tour-menu__icon"><Compass size={21} /></span><div><strong>Экскурсия по геологии</strong><small>Выберите маршрут обучения</small></div><button type="button" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню обучения"><X size={18} /></button></header>
        {completionNotice && <div className="geology-tour-complete"><Check size={16} /><span>{completionNotice}</span></div>}
        {resumeTour && <button className="geology-tour-resume" type="button" onClick={() => startTour(resumeTour, progressQuery.data?.stepIndex ?? 0)}><Play size={17} /><span><strong>Продолжить «{resumeTour.title}»</strong><small>Шаг {(progressQuery.data?.stepIndex ?? 0) + 1} из {resumeTour.steps.length}</small></span><ArrowRight size={16} /></button>}
        <button className="geology-tour-current" type="button" disabled={!location.pathname.startsWith('/geology') && !location.pathname.startsWith('/objects/wells')} onClick={startCurrentPage}><Map size={17} /><span><strong>Обзор текущей страницы</strong><small>Автоматически подсветить все видимые области</small></span></button>
        <div className="geology-tour-list">{geologyTourDefinitions.map((tour) => {
          const completed = progressQuery.data?.completedTourIds.includes(tour.id)
          return <button type="button" key={tour.id} onClick={() => startTour(tour)}><span><strong>{tour.title}</strong><small>{tour.description}</small><em><Clock3 size={13} /> ≈ {tour.estimatedMinutes} мин · {tour.steps.length} шагов</em></span>{completed ? <Check size={17} aria-label="Пройдено" /> : <ArrowRight size={17} />}</button>
        })}</div>
        <button className="geology-tour-reset" type="button" onClick={resetProgress}><RotateCcw size={15} /> Сбросить прогресс обучения</button><footer><BookOpenCheck size={15} /><span>Прогресс сохраняется в IndexedDB и также очищается общим сбросом демоданных.</span></footer>
      </section>}
      <button className={`geology-tour-launcher${progressQuery.data?.launcherSeen ? '' : ' is-new'}`} type="button" onClick={openMenu} aria-expanded={menuOpen} aria-label="Открыть экскурсию по геологическому модулю"><Compass size={21} /><span>Экскурсия</span></button>
    </>
  )

  const overlay = activeTour && activeStep && (
    <div className="geology-tour-layer" role="dialog" aria-modal="true" aria-labelledby="geology-tour-step-title">
      {highlight && <>
        <div className="geology-tour-shade geology-tour-shade--top" style={{ height: Math.max(0, highlight.rect.top - 7) }} />
        <div className="geology-tour-shade geology-tour-shade--left" style={{ top: Math.max(0, highlight.rect.top - 7), width: Math.max(0, highlight.rect.left - 7), height: highlight.rect.height + 14 }} />
        <div className="geology-tour-shade geology-tour-shade--right" style={{ top: Math.max(0, highlight.rect.top - 7), left: highlight.rect.right + 7, height: highlight.rect.height + 14 }} />
        <div className="geology-tour-shade geology-tour-shade--bottom" style={{ top: highlight.rect.bottom + 7 }} />
        <div className="geology-tour-highlight" style={{ top: highlight.rect.top - 7, left: highlight.rect.left - 7, width: highlight.rect.width + 14, height: highlight.rect.height + 14 }} />
      </>}
      <div ref={tooltipRef} tabIndex={-1} className="geology-tour-tooltip" style={highlight ? tooltipPosition(highlight.rect) : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <header><div><span>{activeStep.eyebrow}</span><strong>{stepIndex + 1} / {activeTour.steps.length}</strong></div><button type="button" onClick={pauseTour} aria-label="Завершить экскурсию позже"><X size={18} /></button></header>
        <div className="geology-tour-progress" role="progressbar" aria-valuemin={1} aria-valuemax={activeTour.steps.length} aria-valuenow={stepIndex + 1}><i style={{ width: `${((stepIndex + 1) / activeTour.steps.length) * 100}%` }} /></div>
        {targetLoading ? <div className="geology-tour-loading"><span /><p>Открываем нужную рабочую область…</p></div> : <><h2 id="geology-tour-step-title">{activeStep.title}</h2><p>{activeStep.description}</p>{activeStep.hint && <div className="geology-tour-hint"><Compass size={16} /><span>{activeStep.hint}</span></div>}{highlight?.fallback && <div className="geology-tour-fallback">Элемент изменился или недоступен для текущих прав. Показана страница целиком; экскурсию можно продолжить.</div>}</>}
        <footer><button type="button" className="button button--quiet button--sm" onClick={pauseTour}><Pause size={14} /> Позже</button><span /><button type="button" className="button button--secondary button--sm" disabled={targetLoading || stepIndex === 0} onClick={() => moveTo(stepIndex - 1)}><ArrowLeft size={14} /> Назад</button><button type="button" className="button button--primary button--sm" disabled={targetLoading} onClick={() => moveTo(stepIndex + 1)}>{stepIndex === activeTour.steps.length - 1 ? <><Check size={14} /> Завершить</> : <>Далее <ArrowRight size={14} /></>}</button></footer>
      </div>
    </div>
  )

  return createPortal(<>{launcher}{overlay}</>, document.body)
}

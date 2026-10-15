import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CodeXml, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../entities/session/model/sessionContext'
import { KNOWLEDGE_BRIDGE, knowledgeFramePath, parseKnowledgeContext, safeReturnPath } from '../../internal/knowledge-map/integration/protocol'
import './knowledge-map-host.css'

const route = getRouteApi('/team/knowledge-map')

export function KnowledgeMapPage() {
  const search = route.useSearch()
  const navigate = useNavigate()
  const { persona } = useSession()
  const frame = useRef<HTMLIFrameElement>(null)
  const [source, setSource] = useState(() => knowledgeFramePath(import.meta.env.BASE_URL, search))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const latest = useRef(search)
  useEffect(() => { latest.current = search }, [search])
  const returnTo = safeReturnPath(search.from, persona?.homeRoute ?? '/profile')

  useEffect(() => {
    const previous = document.title
    document.title = 'Карта взаимосвязей · инструмент команды KAPGEO'
    return () => { document.title = previous }
  }, [])

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.channel !== KNOWLEDGE_BRIDGE) return
      if (event.data.type === 'ready') setStatus('ready')
      if (event.data.type === 'error') setStatus('error')
      if (event.data.type !== 'context') return
      const context = parseKnowledgeContext(event.data.context)
      if (!context || (latest.current.mode === context.mode && latest.current.node === context.node)) return
      void navigate({ to: '/team/knowledge-map', search: { ...latest.current, ...context }, replace: true, resetScroll: false })
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [navigate])

  useEffect(() => {
    if (!search.mode || status !== 'ready') return
    frame.current?.contentWindow?.postMessage({ channel: KNOWLEDGE_BRIDGE, type: 'context', context: { mode: search.mode, node: search.node } }, window.location.origin)
  }, [search.mode, search.node, status])

  useEffect(() => {
    const timer = window.setTimeout(() => setStatus(previous => previous === 'loading' ? 'error' : previous), 30000)
    return () => window.clearTimeout(timer)
  }, [source])

  const retry = () => { setStatus('loading'); setSource(`${knowledgeFramePath(import.meta.env.BASE_URL, search).split('#')[0]}?retry=${Date.now()}${search.mode ? `#${new URLSearchParams({ mode: search.mode, ...(search.node ? { node: search.node } : {}) })}` : ''}`) }

  return <section className="team-knowledge-host" aria-label="Внутренняя карта взаимосвязей">
    <header className="team-knowledge-host__bar">
      <div className="team-knowledge-host__identity"><CodeXml size={21} aria-hidden="true" /><div><strong>Карта взаимосвязей</strong><span>Внутренний инструмент команды · вне дизайна прототипа</span></div><span className="team-knowledge-host__badge">TEAM / DEV</span></div>
      <button type="button" className="team-knowledge-host__back" onClick={() => void navigate({ href: returnTo })}><ArrowLeft size={17} />В прототип</button>
    </header>
    <div className="team-knowledge-host__body">
      <iframe ref={frame} src={source} title="Карта взаимосвязей KAPGEO — инструмент команды" className="team-knowledge-host__frame" allow="clipboard-write" inert={status !== 'ready'} onError={() => setStatus('error')} />
      {status !== 'ready' && <div className="team-knowledge-host__state" role={status === 'error' ? 'alert' : 'status'}><CodeXml size={30} /><strong>{status === 'loading' ? 'Открываем карту взаимосвязей…' : 'Карта не загрузилась'}</strong><p>{status === 'loading' ? 'Подготавливаем внутренний атлас команды.' : 'Повторите загрузку или вернитесь в прототип.'}</p>{status === 'error' && <button type="button" onClick={retry}><RefreshCw size={16} />Повторить загрузку</button>}</div>}
    </div>
  </section>
}

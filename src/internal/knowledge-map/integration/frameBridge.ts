import { KNOWLEDGE_BRIDGE, knowledgeHostShareUrl, parseKnowledgeContext, type KnowledgeContext } from './protocol'

function post(type: string, context?: KnowledgeContext) {
  if (window.parent !== window) window.parent.postMessage({ channel: KNOWLEDGE_BRIDGE, type, context }, window.location.origin)
}

export function announceKnowledgeReady() { post('ready') }
export function announceKnowledgeError() { post('error') }

export function publishKnowledgeContext(context: KnowledgeContext) {
  post('context', context)
}

export function listenForKnowledgeContext() {
  const receive = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.channel !== KNOWLEDGE_BRIDGE || event.data?.type !== 'context') return
    const context = parseKnowledgeContext(event.data.context)
    if (!context) return
    const hash = new URLSearchParams({ mode: context.mode })
    if (context.node) hash.set('node', context.node)
    if (window.location.hash !== `#${hash}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${hash}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }
  window.addEventListener('message', receive)
  return () => window.removeEventListener('message', receive)
}

/** Share the host route, never the iframe's private HTML entry point. */
export function knowledgeShareUrl(context: KnowledgeContext) {
  if (window.parent === window) return window.location.href
  return knowledgeHostShareUrl(window.parent.location.href, context)
}

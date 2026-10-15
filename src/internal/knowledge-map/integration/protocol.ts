/** The only contract shared with the prototype shell. No business data crosses it. */
export const KNOWLEDGE_BRIDGE = 'kapgeo.team-knowledge.v1'
export const KNOWLEDGE_MODES = ['processes', 'specialists', 'data', 'modules'] as const
export type KnowledgeMode = typeof KNOWLEDGE_MODES[number]
export interface KnowledgeContext { mode: KnowledgeMode; node?: string }
export interface KnowledgeMapSearch { mode?: KnowledgeMode; node?: string; from?: string }

export function parseKnowledgeContext(value: unknown): KnowledgeContext | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (!KNOWLEDGE_MODES.includes(item.mode as KnowledgeMode)) return null
  const node = typeof item.node === 'string' && /^[a-z0-9-]{1,100}$/.test(item.node) ? item.node : undefined
  return { mode: item.mode as KnowledgeMode, node }
}

export function safeReturnPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback
  const path = value.split(/[?#]/)[0]
  return /^\/(geology|technology|modeling|analytics|admin|profile)(\/|$)/.test(path ?? '') ? value : fallback
}

export function validateKnowledgeSearch(search: Record<string, unknown>): KnowledgeMapSearch {
  const context = parseKnowledgeContext(search)
  return { mode: context?.mode, node: context?.node, from: safeReturnPath(search.from, '') || undefined }
}

export function knowledgeFramePath(base: string, context: KnowledgeMapSearch): string {
  const params = new URLSearchParams()
  if (context.mode) params.set('mode', context.mode)
  if (context.node) params.set('node', context.node)
  return `${base}internal/knowledge-map.html${params.size ? `#${params}` : ''}`
}

export function knowledgeHostShareUrl(parentHref: string, context: KnowledgeContext) {
  const url = new URL(parentHref)
  const hashRouting = url.hash.startsWith('#/')
  const route = new URL(hashRouting ? url.hash.slice(1) : `${url.pathname}${url.search}`, url.origin)
  route.searchParams.set('mode', context.mode)
  if (context.node) route.searchParams.set('node', context.node)
  else route.searchParams.delete('node')
  route.searchParams.delete('from')
  if (hashRouting) url.hash = `${route.pathname}${route.search}`
  else { url.pathname = route.pathname; url.search = route.search }
  return url.href
}

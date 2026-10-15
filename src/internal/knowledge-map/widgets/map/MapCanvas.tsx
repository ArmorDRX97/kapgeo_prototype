import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Background, BackgroundVariant, ControlButton, Controls, getNodesBounds, getViewportForBounds, MarkerType, MiniMap, ReactFlow, useReactFlow, type Edge, type NodeChange, type Viewport } from '@xyflow/react'
import { Compass, Layers3, LoaderCircle, Maximize, RotateCcw } from 'lucide-react'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import { neighborhood, type GraphPath, type projectGraph } from '../../entities/knowledge/graph'
import type { ExplorerState } from '../../features/explore/state'
import { KnowledgeNode, type FlowNode } from './KnowledgeNode'
import { createLayoutTask } from '../../shared/layout'
import { viewportIntersectsBounds } from '../../shared/viewport'

const nodeTypes = { knowledge: KnowledgeNode }
type Point = { x: number; y: number }
const nodeHeight = (type: string, compact: boolean, delivery = false) => (compact ? 116 : type === 'domain' ? 156 : 188) + (delivery ? compact ? 20 : 28 : 0)
interface Props {
  index: KnowledgeIndex; projection: ReturnType<typeof projectGraph>; state: ExplorerState; contextKey: string; layoutVersion: number; path: GraphPath | null
  onOpen: (id: string) => void; onExpand: (id: string) => void; onViewport: (key: string, viewport: Viewport) => void
  onPosition: (key: string, id: string, position: Point) => void; onEdge: (id: string) => void; onResetFilters: () => void
}
export function MapCanvas({ index, projection, state, contextKey, layoutVersion, path, onOpen, onExpand, onViewport, onPosition, onEdge, onResetFilters }: Props) {
  const flow = useReactFlow<FlowNode>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<{ signature: string; positions: Record<string, Point>; busy: boolean; error: string | null }>({ signature: '', positions: {}, busy: true, error: null })
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [retry, setRetry] = useState(0)
  const [duration, setDuration] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420)
  const savedPositions = useRef(state.positions)
  const savedViewports = useRef(state.viewports)
  const projectionRef = useRef(projection)
  useEffect(() => { savedPositions.current = state.positions; savedViewports.current = state.viewports; projectionRef.current = projection })
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { setDuration(reduced.matches ? 0 : 420) }
    update(); reduced.addEventListener('change', update)
    return () => reduced.removeEventListener('change', update)
  }, [])
  const signature = JSON.stringify({ nodes: projection.nodes.map(n => n.id), edges: projection.edges.map(e => e.id), compact: state.compact, contextKey, layoutVersion, retry })
  useEffect(() => {
    const current = projectionRef.current
    const overview = current.nodes.length > 0 && current.nodes.every(n => (n.type === 'domain' || n.type === 'module') && n.overviewPosition)
    const saved = layoutVersion === 0 ? savedPositions.current[contextKey] ?? {} : {}
    const fallback = Object.fromEntries(current.nodes.map((n, i) => [n.id, saved[n.id] ?? { x: (i % 4) * 350, y: Math.floor(i / 4) * 245 }]))
    if (overview && layoutVersion === 0) {
      setLayout({ signature, positions: Object.fromEntries(current.nodes.map(n => [n.id, saved[n.id] ?? n.overviewPosition!])), busy: false, error: null })
      return
    }
    if (!current.nodes.length) { setLayout({ signature, positions: {}, busy: false, error: null }); return }
    setLayout({ signature, positions: fallback, busy: true, error: null })
    let task: ReturnType<typeof createLayoutTask> | undefined
    let cancelled = false
    const fail = (reason?: unknown) => { window.clearTimeout(timer); task?.terminate(); if (cancelled) return; if (import.meta.env.DEV) console.error('KAPGEO: layout worker failed', reason); setLayout({ signature, positions: fallback, busy: false, error: 'Автораскладка недоступна. Элементы размещены сеткой; их можно перемещать вручную.' }) }
    const timer = window.setTimeout(() => fail('Worker timeout'), 15000)
    try {
      task = createLayoutTask(current.nodes.map(n => ({ id: n.id, width: 280, height: nodeHeight(n.type, state.compact, !!n.delivery) })), current.edges.filter(e => e.type !== 'related_to' || current.nodes.every(n => n.type === 'role' || n.type === 'module')).map(e => ({ id: e.id, source: e.source, target: e.target })))
      void task.promise.then(positions => {
        if (cancelled) return
        window.clearTimeout(timer)
        const result = { ...positions }
        for (const key of Object.keys(result)) if (saved[key]) result[key] = saved[key]
        setLayout({ signature, positions: result, busy: false, error: null })
        task?.terminate()
      }).catch(fail)
    } catch (error) { window.clearTimeout(timer); fail(error) }
    return () => { cancelled = true; window.clearTimeout(timer); task?.terminate() }
  }, [signature, contextKey, layoutVersion, state.compact])

  const related = useMemo(() => state.selected ? neighborhood(index, state.selected, 1, true) : null, [index, state.selected])
  const pathEdges = useMemo(() => new Map(path?.steps.map(step => [step.edge.id, step]) ?? []), [path])
  const nodes: FlowNode[] = useMemo(() => projection.nodes.map((item, i) => ({
    id: item.id, type: 'knowledge', position: layout.positions[item.id] ?? { x: (i % 4) * 350, y: Math.floor(i / 4) * 245 },
    width: 280, height: nodeHeight(item.type, state.compact, !!item.delivery), selected: item.id === state.selected, dragHandle: '.node-drag',
    ariaLabel: `${item.title}. ${item.summary}`, focusable: true,
    data: { item, category: index.byCategory.get(item.categoryId)!, children: (index.children.get(item.id) ?? []).filter(id => index.byId.get(id)?.type !== 'role' && (item.type === 'module' || index.byId.get(id)?.type !== 'module')).length,
      expanded: state.expanded.includes(item.id), compact: state.compact, dimmed: !!related && !related.has(item.id) && !path,
      pinned: state.pinned.includes(item.id), path: !!path?.nodeIds.includes(item.id), open: onOpen, expand: onExpand },
  })), [projection.nodes, layout.positions, state.compact, state.selected, state.expanded, state.pinned, index, related, path, onOpen, onExpand])
  const edges: Edge[] = useMemo(() => projection.edges.map(edge => {
    const step = pathEdges.get(edge.id)
    const outgoing = edge.source === state.selected
    const incoming = edge.target === state.selected
    const emphasized = outgoing || incoming || !!step
    return {
      id: edge.id, source: step?.reversed ? edge.target : edge.source, target: step?.reversed ? edge.source : edge.target,
      type: 'smoothstep', label: edge.type !== 'contains' && (zoom >= 0.64 || emphasized) ? edge.label : undefined,
      style: { stroke: step ? 'var(--path-color)' : outgoing ? 'var(--connection-out)' : incoming ? 'var(--connection-in)' : 'var(--connection)', strokeWidth: emphasized ? 2.3 : 1.25, strokeDasharray: edge.type === 'contains' || edge.type === 'related_to' ? '5 5' : undefined, opacity: state.selected && !emphasized ? 0.25 : 0.85 },
      labelStyle: { fontSize: 10, fill: 'var(--text-muted)', fontWeight: 500 }, labelBgStyle: { fill: 'var(--canvas)', fillOpacity: 0.96 }, labelBgPadding: [7, 5] as [number, number], labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: step ? 'var(--path-color)' : outgoing ? 'var(--connection-out)' : incoming ? 'var(--connection-in)' : 'var(--connection)' },
      ariaLabel: `${index.byId.get(edge.source)?.title}: ${edge.description}`, focusable: true, interactionWidth: 24,
    }
  }), [projection.edges, pathEdges, state.selected, zoom, index])

  const fitKnownNodes = useCallback(() => {
    const size = canvasRef.current?.getBoundingClientRect()
    if (!size || !nodes.length) return
    const view = getViewportForBounds(getNodesBounds(nodes), size.width, size.height, 0.1, 1, 0.12)
    void flow.setViewport(view, { duration })
  }, [nodes, flow, duration])
  const lastNavigation = useRef('')
  useEffect(() => {
    if (!ready || layout.busy || layout.signature !== signature) return
    const token = `${signature}|${state.selected ?? ''}`
    if (lastNavigation.current === token) return
    lastNavigation.current = token
    const timer = window.setTimeout(() => {
      const node = state.selected ? nodes.find(item => item.id === state.selected) : null
      const saved = savedViewports.current[contextKey]
      const size = canvasRef.current?.getBoundingClientRect()
      if (node && !state.focus && !path && !state.activeTour) {
        // Keep an opened area readable; a tall branch must not shrink every
        // explanation to a few pixels. The minimap and Fit control retain overview.
        const x = node.position.x + (node.data.item.type === 'domain' ? 280 : 140)
        void flow.setCenter(x, node.position.y + nodeHeight(node.data.item.type, state.compact, !!node.data.item.delivery) / 2, { zoom: Math.max(0.75, Math.min(flow.getZoom(), 1)), duration })
      } else if (saved && size && !state.selected && layoutVersion === 0 && viewportIntersectsBounds(saved, getNodesBounds(nodes), size.width, size.height)) {
        void flow.setViewport(saved, { duration: 0 })
      } else fitKnownNodes()
    }, 70)
    return () => window.clearTimeout(timer)
  }, [ready, layout.busy, layout.signature, signature, state.selected, state.focus, state.compact, state.activeTour, flow, contextKey, layoutVersion, path, duration, nodes, fitKnownNodes])
  const onChanges = useCallback((changes: NodeChange<FlowNode>[]) => {
    const moved = changes.filter(change => change.type === 'position' && change.position)
    if (!moved.length) return
    setLayout(previous => ({ ...previous, positions: { ...previous.positions, ...Object.fromEntries(moved.map(change => change.type === 'position' ? [change.id, change.position] : [])) } }))
  }, [])
  return <div ref={canvasRef} className="map-canvas" data-testid="map-canvas" aria-label="Интерактивная карта знаний">
    <ReactFlow<FlowNode>
      nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onChanges}
      onInit={() => setReady(true)} minZoom={0.1} maxZoom={2.5}
      onNodeClick={(_, node) => onOpen(node.id)} onNodeDoubleClick={(_, node) => { if (node.data.children) onExpand(node.id) }}
      onNodeDragStop={(_, node) => onPosition(contextKey, node.id, node.position)}
      onEdgeClick={(_, edge) => onEdge(edge.id)}
      onMoveEnd={(_, viewport) => { setZoom(viewport.zoom); onViewport(contextKey, viewport) }}
      nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null}
      selectionOnDrag={false} panOnDrag={[0, 1]} zoomOnScroll panOnScroll={false} preventScrolling
      onlyRenderVisibleElements defaultEdgeOptions={{ type: 'smoothstep' }}
      ariaLabelConfig={{ 'controls.zoomIn.ariaLabel': 'Приблизить', 'controls.zoomOut.ariaLabel': 'Отдалить', 'controls.fitView.ariaLabel': 'Показать всю карту', 'minimap.ariaLabel': 'Мини-карта', 'node.a11yDescription.default': 'Enter — выбрать. Стрелки — переместить узел. Escape — снять выделение.' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--grid)" />
      <Controls position="bottom-left" showInteractive={false} showFitView={false}><ControlButton onClick={fitKnownNodes} aria-label="Показать всю карту" title="Показать всю карту"><Maximize size={14} /></ControlButton></Controls>
      <MiniMap position="bottom-right" nodeColor={node => node.id === state.selected ? 'var(--accent)' : 'var(--minimap-node)'} maskColor="var(--minimap-mask)" pannable zoomable />
    </ReactFlow>
    <div className="canvas-caption"><span className="tiny-dot" /><span>{state.focus ? `Фокус · ${state.depth === 1 ? 'один шаг' : 'два шага'}` : path ? 'Исследование пути' : state.activeTour ? 'Учебный маршрут' : 'Живая карта знаний'}</span><span className="caption-divider" />{nodes.length} элементов</div>
    {!nodes.length && <div className="canvas-empty"><Layers3 size={32} /><h3>Здесь пока ничего не видно</h3><p>Выбранные фильтры исключили все элементы этого представления.</p><button className="button primary" onClick={onResetFilters}>Сбросить фильтры</button></div>}
    {layout.busy && <div className="canvas-loading" role="status"><LoaderCircle size={16} className="spin" />Располагаем элементы…</div>}
    {layout.error && <div className="canvas-warning" role="status"><p>{layout.error}</p><button className="text-button" onClick={() => setRetry(x => x + 1)}><RotateCcw size={14} />Повторить</button></div>}
    <div className="canvas-hint"><Compass size={14} /><span>Тяните фон для перемещения · колесо для масштаба</span></div>
    <button className="fit-floating icon-button" aria-label="Вписать карту в окно" onClick={fitKnownNodes}><Maximize size={18} /></button>
  </div>
}

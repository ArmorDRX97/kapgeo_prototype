import ELK from 'elkjs/lib/elk-api.js'
import layoutWorkerUrl from 'elkjs/lib/elk-worker.min.js?url'

/** ELK's GWT worker requires classic-script semantics. Vite copies this local
 * asset verbatim, so development and static builds use the same worker. */
export function createLayoutTask(nodes: { id: string; width: number; height: number }[], edges: { id: string; source: string; target: string }[]) {
  const worker = new Worker(layoutWorkerUrl)
  const elk = new ELK({ workerFactory: () => worker })
  const promise = elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '56', 'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.randomSeed': '42',
    },
    children: nodes,
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }).then(result => Object.fromEntries((result.children ?? []).map(n => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])))
  return { promise, terminate: () => elk.terminateWorker() }
}

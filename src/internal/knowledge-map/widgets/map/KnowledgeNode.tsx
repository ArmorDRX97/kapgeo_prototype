import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { ArrowUpRight, Boxes, ChevronDown, ChevronRight, Circle, Database, Factory, Fingerprint, FlaskConical, Grip, Layers3, MapPinned, Network, Pickaxe, Pin, ScanLine, ShieldCheck, Users, Waypoints, Wrench } from 'lucide-react'
import type { Category, KnowledgeNode as DomainNode } from '../../entities/knowledge/schema'
import { deliveryStatusLabels, nodeLabels } from '../../entities/knowledge/labels'

const categoryIcons = { territory: MapPinned, exploration: Pickaxe, research: ScanLine, interpretation: Layers3, planning: Waypoints, production: Factory, monitoring: ShieldCheck, maintenance: Wrench, accounting: Boxes, management: Network }
const typeIcons = { domain: Layers3, process: Waypoints, activity: FlaskConical, entity: Fingerprint, data: Database, role: Users, module: Boxes, concept: Circle }
export interface KnowledgeNodeData extends Record<string, unknown> {
  item: DomainNode; category: Category; children: number; expanded: boolean; compact: boolean; dimmed: boolean; pinned: boolean; path: boolean
  open: (id: string) => void; expand: (id: string) => void
}
export type FlowNode = Node<KnowledgeNodeData, 'knowledge'>

export const KnowledgeNode = memo(function KnowledgeNode({ data, selected }: NodeProps<FlowNode>) {
  const { item, category } = data
  const Icon = item.type === 'domain' ? categoryIcons[item.categoryId as keyof typeof categoryIcons] ?? Layers3 : typeIcons[item.type]
  return <article className={`knowledge-node tone-${category.tone} kind-${item.type} ${item.delivery ? 'has-delivery' : ''} ${selected ? 'is-selected' : ''} ${data.compact ? 'is-compact' : ''} ${data.dimmed ? 'is-dimmed' : ''} ${data.path ? 'on-path' : ''}`}>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <div className="node-drag"><span className="node-icon"><Icon size={19} strokeWidth={1.6} /></span><span className={`node-type type-${item.type}`}>{item.type === 'domain' ? 'ПРЕДМЕТНАЯ ОБЛАСТЬ' : nodeLabels[item.type]}</span>{data.pinned ? <Pin size={13} /> : <Grip size={13} className="node-grip" />}</div>
    <button className="node-open nodrag" onClick={event => { event.stopPropagation(); data.open(item.id) }} aria-label={`Изучить: ${item.title}`}>
      <h3>{item.title}</h3>{!data.compact && <p>{item.summary}</p>}
      {item.delivery && <span className={`node-delivery status-${item.delivery.status}`}>{deliveryStatusLabels[item.delivery.status]}</span>}
    </button>
    <div className="node-footer">
      {data.children > 0 ? <button className="node-expand nodrag" onClick={event => { event.stopPropagation(); data.expand(item.id) }} aria-label={`${data.expanded ? 'Свернуть' : 'Раскрыть'}: ${item.title}`} aria-expanded={data.expanded}>
        {data.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span>{data.expanded ? 'Свернуть' : `${data.children} элементов`}</span>
      </button> : <span className="node-category">{category.shortTitle}</span>}
      <ArrowUpRight size={15} aria-hidden="true" />
    </div>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </article>
})

import { useEffect, useRef } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Ban, BookOpen, Check, CheckCircle2, CircleDashed, CircleMinus, Clock3, Crosshair, Lightbulb, Link2, Pin, PinOff, Route, X } from 'lucide-react'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import type { KnowledgeEdge, KnowledgeNode } from '../../entities/knowledge/schema'
import { deliveryStatusLabels, nodeLabels, relationScopeLabels } from '../../entities/knowledge/labels'

interface Props { node: KnowledgeNode; index: KnowledgeIndex; pinned: boolean; focused: boolean; onClose: () => void; onOpen: (id: string) => void; onPin: () => void; onFocus: () => void; onPath: (id: string) => void; onShare: () => void }
const scopeLabels = { domain: '', implemented: 'Есть в текущем прототипе', retained: 'Реализация сохранена, вход скрыт', planned: 'Назначение области · пока заглушка' }
const deliveryIcons = { prototype: CheckCircle2, partial: CircleMinus, placeholder: CircleDashed, deferred: Clock3, excluded: Ban }
const sourceKindLabels = { manual: 'Руководство', 'video-audit': 'Видеоматериал', review: 'Обзор / схема', implementation: 'Реализация', decision: 'Требования / роли' }
const knowledgeBasisLabels = { source: 'Группа источников', legacy: 'Старая система · материалы и демонстрации', requirement: 'Требования и функциональная структура', open: 'Открытый вопрос · правило не установлено', context: 'Предметный контекст · учебное объяснение' }

function resolvedEvidence(evidence: KnowledgeEdge['evidence'], index: KnowledgeIndex) {
  const seen = new Set<string>()
  return evidence.flatMap(item => {
    const key = `${item.sourceId}\u0000${item.locator}`
    const source = index.bySourceId.get(item.sourceId)
    if (!source || seen.has(key)) return []
    seen.add(key)
    return [{ source, locator: item.locator }]
  })
}

function EvidenceList({ evidence, index, compact = false }: { evidence: KnowledgeEdge['evidence']; index: KnowledgeIndex; compact?: boolean }) {
  const items = resolvedEvidence(evidence, index)
  if (!items.length) return null
  if (compact) return <span className="related-evidence">Основания: {items.map(({ source, locator }) => `${source.title} · ${locator}`).join('; ')}</span>
  return <ul className={compact ? 'source-list related-evidence' : 'source-list'}>{items.map(({ source, locator }) => <li className="source-entry" key={`${source.id}-${locator}`}>
    <strong>{source.title}</strong>
    <span className="source-kind">{sourceKindLabels[source.kind]} · {source.asOf}</span>
    <span>{locator}</span>
    <span>{source.reference}</span>
  </li>)}</ul>
}
export function DetailPanel({ node, index, pinned, focused, onClose, onOpen, onPin, onFocus, onPath, onShare }: Props) {
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => { scroll.current?.scrollTo?.({ top: 0 }) }, [node.id])
  const explanation = node.explanation
  const related = (index.adjacent.get(node.id) ?? []).filter(edge => edge.type !== 'contains')
  const DeliveryIcon = node.delivery ? deliveryIcons[node.delivery.status] : Check
  const nodeEvidence = resolvedEvidence(node.evidence, index)
  return <aside className="detail-panel" aria-label={`Описание: ${node.title}`}>
    <header className="detail-header"><span className={`type-badge type-${node.type}`}>{nodeLabels[node.type]}</span><div className="flex items-center gap-1"><button className="icon-button" onClick={onPin} aria-label={pinned ? 'Открепить элемент' : 'Закрепить элемент'} title={pinned ? 'Открепить' : 'Закрепить'}>{pinned ? <PinOff size={17} /> : <Pin size={17} />}</button><button className="icon-button" onClick={onClose} aria-label="Закрыть описание"><X size={19} /></button></div></header>
    <div className="detail-scroll" ref={scroll}>
      <div className="eyebrow">{index.byCategory.get(node.categoryId)?.shortTitle}</div>
      <h2>{node.title}</h2><p className="detail-summary">{node.summary}</p>
      <p className="module-scope">{knowledgeBasisLabels[node.knowledgeBasis]}</p>
      {node.delivery && <section className={`delivery-status status-${node.delivery.status}`}><DeliveryIcon size={15} /><div><h3>Статус в KAPGEO · {deliveryStatusLabels[node.delivery.status]}</h3><p>{node.delivery.note}</p></div></section>}
      {node.type === 'module' && !node.delivery && node.scope !== 'domain' && <p className={`module-scope scope-${node.scope}`}><Check size={14} />{scopeLabels[node.scope]}</p>}
      <div className="detail-actions"><button className={`button ${focused ? 'primary' : ''}`} onClick={onFocus}><Crosshair size={15} />{focused ? 'Выйти из фокуса' : 'Фокус'}</button><button className="button" onClick={() => onPath(node.id)}><Route size={15} />Путь</button><button className="icon-button" onClick={onShare} aria-label="Скопировать ссылку на элемент"><Link2 size={17} /></button></div>
      <section><h3>Что это?</h3><p>{explanation.what}</p></section>
      <section><h3>Зачем нужно?</h3><p>{explanation.why}</p></section>
      <section><h3>Как работает?</h3><ol className="explanation-steps">{explanation.how.map((text, i) => <li key={text}><span>{i + 1}</span><p>{text}</p></li>)}</ol></section>
      <section><h3>Кто участвует?</h3><ul className="plain-list">{explanation.participants.map(text => <li key={text}>{text}</li>)}</ul></section>
      <div className="input-output"><section><h3><ArrowDownLeft size={15} />Что требуется на входе?</h3><ul>{explanation.inputs.map(text => <li key={text}>{text}</li>)}</ul></section><section><h3><ArrowUpRight size={15} />Что получается на выходе?</h3><ul>{explanation.outputs.map(text => <li key={text}>{text}</li>)}</ul></section></div>
      <section><h3>Что происходит дальше?</h3><p>{explanation.next}</p></section>
      <section className="practice-example"><h3><Lightbulb size={16} />Пример из практики</h3><p>{explanation.example}</p><span>Все ситуации и обозначения в атласе — учебные.</span></section>
      {nodeEvidence.length > 0 && <section className="evidence-section"><h3>Основания и источники</h3><EvidenceList evidence={node.evidence} index={index} /></section>}
      <section className="related-section"><h3>С чем связано? <span className="count-badge">{related.length}</span></h3>{related.length ? related.map(edge => {
        const targetId = edge.source === node.id ? edge.target : edge.source
        const other = index.byId.get(targetId)!
        return <button className="related-item" key={edge.id} onClick={() => onOpen(targetId)}><span className="related-direction">{edge.source === node.id ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}</span><span><strong>{other.title}</strong><small>{edge.label}</small><span className="relation-scope">{relationScopeLabels[edge.relationScope]}</span><span className="relation-explanation">{edge.description}</span><EvidenceList evidence={edge.evidence} index={index} compact /></span><ArrowRight size={14} /></button>
      }) : <p>Прямые предметные связи пока не заданы.</p>}</section>
      <div className="detail-footnote"><BookOpen size={14} />Учебное объяснение предметной области</div>
    </div>
  </aside>
}

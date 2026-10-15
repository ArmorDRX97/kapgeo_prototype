import { relationScopeLabels } from '../../entities/knowledge/labels'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, Route } from 'lucide-react'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import { findPath, type GraphPath, type PathDirection } from '../../entities/knowledge/graph'
import { NODE_TYPES } from '../../entities/knowledge/schema'
import { nodeLabels } from '../../entities/knowledge/labels'
import { Dialog } from '../../shared/Dialog'

export interface PathSelection { from: string; to: string; direction: PathDirection }
export function PathExplorer({ index, value, onChange, onShow, onClose, onOpen }: { index: KnowledgeIndex; value: PathSelection; onChange: (value: PathSelection) => void; onShow: (path: GraphPath | null) => void; onClose: () => void; onOpen: (id: string) => void }) {
  const [attempted, setAttempted] = useState(false)
  const result = useMemo(() => findPath(index, value.from, value.to, value.direction), [index, value])
  const options = NODE_TYPES.map(type => <optgroup key={type} label={nodeLabels[type]}>{index.nodes.filter(n => n.type === type).sort((a, b) => a.title.localeCompare(b.title, 'ru')).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</optgroup>)
  const change = (next: PathSelection) => { setAttempted(false); onChange(next) }
  return <Dialog title="Исследовать путь между элементами" onClose={onClose} className="path-dialog"><p className="dialog-intro">Узнайте, какие реальные действия и данные связывают два понятия. Учебные группы не используются как короткий путь. Цепочка объясняет предметный смысл; она не доказывает обмен данными между модулями.</p>
    <form onSubmit={event => { event.preventDefault(); setAttempted(true); onShow(result) }}><div className="path-selectors"><label>Откуда<select value={value.from} onChange={event => change({ ...value, from: event.target.value })}>{options}</select></label><ArrowRight size={19} /><label>Куда<select value={value.to} onChange={event => change({ ...value, to: event.target.value })}>{options}</select></label></div><fieldset className="path-direction"><legend>Как искать</legend><label><input type="radio" name="direction" checked={value.direction === 'flow'} onChange={() => change({ ...value, direction: 'flow' })} />По направлению работы и данных</label><label><input type="radio" name="direction" checked={value.direction === 'connections'} onChange={() => change({ ...value, direction: 'connections' })} />По предметным связям в обе стороны</label></fieldset><p className="subtle-note">В потоке данных связь «использует» читается от входных данных к потребителю. Во втором режиме направление стрелки может быть обратным.</p><button className="button primary" type="submit"><Route size={16} />Показать путь</button></form>
    {attempted && !result && <div className="path-not-found" role="status"><h3>Осмысленный путь не найден</h3><p>В модели нет подходящей цепочки для этих элементов и направления. Можно поменять направление поиска или выбрать другие элементы.</p></div>}
    {attempted && result && <div className="path-results" aria-live="polite"><h3>{result.steps.length ? `Найден путь: ${result.steps.length} ${result.steps.length === 1 ? 'связь' : result.steps.length < 5 ? 'связи' : 'связей'}` : 'Это один и тот же элемент'}</h3>{result.nodeIds.map((id, i) => <div key={id}><button className="path-step" onClick={() => onOpen(id)}><span>{i + 1}</span><strong>{index.byId.get(id)?.title}</strong><ArrowRight size={15} /></button>{result.steps[i] && <div className="path-relation"><ArrowDown size={14} /><div><strong>{result.steps[i]!.edge.label}{result.steps[i]!.reversed ? ' · связь читается в обратную сторону' : ''}</strong><span className="relation-scope">{relationScopeLabels[result.steps[i]!.edge.relationScope]}</span><p>{result.steps[i]!.edge.description}</p></div></div>}</div>)}<button className="button primary path-go" onClick={onClose}>Перейти к карте<ArrowRight size={16} /></button></div>}
  </Dialog>
}

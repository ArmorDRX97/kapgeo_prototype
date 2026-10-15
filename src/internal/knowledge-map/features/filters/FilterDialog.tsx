import { RotateCcw } from 'lucide-react'
import { Dialog } from '../../shared/Dialog'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import { EDGE_TYPES, NODE_TYPES } from '../../entities/knowledge/schema'
import { edgeLabels, nodeLabels } from '../../entities/knowledge/labels'
import type { GraphFilter } from '../../entities/knowledge/graph'

function toggle<T>(values: T[], item: T): T[] { return values.includes(item) ? values.filter(value => value !== item) : [...values, item] }
export function FilterDialog({ index, value, onChange, onClose }: { index: KnowledgeIndex; value: GraphFilter; onChange: (value: GraphFilter) => void; onClose: () => void }) {
  return <Dialog title="Настроить карту" onClose={onClose} className="filter-dialog"><p className="dialog-intro">Выберите нужные элементы и смысл связей. Пустая группа означает «все». Фокус, путь и учебный маршрут временно показывают свой контекст поверх фильтров.</p>
    <fieldset><legend>Типы элементов</legend><div className="filter-grid">{NODE_TYPES.map(type => <label key={type}><input type="checkbox" checked={value.types.includes(type)} onChange={() => onChange({ ...value, types: toggle(value.types, type) })} /><span className={`type-dot type-${type}`} />{nodeLabels[type]}<span className="filter-count">{index.nodes.filter(n => n.type === type).length}</span></label>)}</div></fieldset>
    <fieldset><legend>Предметные области</legend><div className="filter-grid">{index.categories.map(category => <label key={category.id}><input type="checkbox" checked={value.categories.includes(category.id)} onChange={() => onChange({ ...value, categories: toggle(value.categories, category.id) })} />{category.shortTitle}</label>)}</div></fieldset>
    <fieldset><legend>Смысл связей</legend><div className="filter-grid">{EDGE_TYPES.map(type => <label key={type}><input type="checkbox" checked={value.relations.includes(type)} onChange={() => onChange({ ...value, relations: toggle(value.relations, type) })} />{edgeLabels[type]}</label>)}</div></fieldset>
    <div className="dialog-footer"><button className="button" onClick={() => onChange({ types: [], categories: [], relations: [] })}><RotateCcw size={15} />Сбросить фильтры</button><button className="button primary" onClick={onClose}>Посмотреть карту</button></div>
  </Dialog>
}

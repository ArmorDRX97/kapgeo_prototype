import { nearestEdge } from '../model/canvasCommands'
import { useEffect, useRef, useState } from 'react'
import type { GeologySection, SectionGraphic, XZ } from '../../../entities/geology-section/model/types'
import { graphicIssues, snappedPoint } from '../../../entities/geology-section/lib/geometry'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { resolveGraphicPoints } from '../../../entities/geology-section/lib/boundaries'
import { Button } from '../../../shared/ui/Button'
import { SectionCanvas, type HandlePhase } from './SectionCanvas'
import { rockNames, nextLocalId } from '../model/presentation'
import { lithologyHole } from '../model/lithologyHole'
import { moveManualPoint } from '../model/manualPoint'
import { GraphHelp, ToolCategory } from './SectionGraphicWorkspace'
import { useRevealTool } from '../model/toolContext'
import { SectionToolButton } from './SectionToolButton'
import { Activity, CirclePlus, Layers, Move, MoveHorizontal, MoveUpRight, Mountain, Plus, Trash2, Waves } from 'lucide-react'

const typeNames: Record<SectionGraphic['type'], string> = { lithology: 'Литологическая область', oxidation: 'Зона окисления', foundation: 'Фундамент', fault: 'Разлом' }
const typeIcons = { lithology: Layers, oxidation: Waves, foundation: Mountain, fault: Activity }
export function GraphicEditor({ section, mode, disabled, onChange, selection, onSelect, onPending }: { section: GeologySection; mode: 'lithology' | 'oxidation' | 'foundation'; disabled: boolean; onChange: (s: GeologySection) => void; selection?: string; onSelect: (id: string) => void; onPending: (pending: boolean) => void }) {
  const [draft, setDraft] = useState<SectionGraphic | null>(null), [error, setError] = useState(''), [snap, setSnap] = useState(true), [snapLabel, setSnapLabel] = useState('')
  const revealTool = useRevealTool()
  const [tool, setTool] = useState<'move' | 'add' | 'delete' | 'shift' | 'line'>('move')
  const drag = useRef<{ graphic: SectionGraphic; previous: SectionGraphic | null; index: number } | null>(null)
  const [shiftX, setShiftX] = useState(0), [shiftZ, setShiftZ] = useState(0)
  const types: SectionGraphic['type'][] = mode === 'foundation' ? ['foundation', 'fault'] : [mode]
  useEffect(() => { onPending(!!draft); return () => onPending(false) }, [draft, onPending])
  const visible = section.graphics.filter(g => types.includes(g.type)), selected = visible.find(g => g.id === selection), current = draft ?? selected
  const start = (type: SectionGraphic['type'], parentId?: string) => {
    const id = nextLocalId(section.graphics, 'GRAPHIC'), length = profileLength(section.profile)
    if (parentId) {
      const parent = visible.find(g => g.id === parentId), hole = parent ? lithologyHole(section, parent, id) : null
      if (!hole) { setError('Не удалось разместить исключение внутри области. Проверьте её размер и существующие исключения.'); return }
      setDraft(hole)
    } else setDraft({ id, type, name: `${typeNames[type]} ${visible.filter(g => !g.parentId).length + 1}`, closed: type === 'lithology', reversed: false, smooth: false,
      points: [{ x: length / 4, z: section.top - (section.top - section.bottom) / 3 }, { x: length * 3 / 4, z: section.top - (section.top - section.bottom) / 3 }, ...(type === 'lithology' ? [{ x: length / 2, z: section.top - (section.top - section.bottom) * 2 / 3 }] : [])],
      rock: type === 'lithology' ? 'sand' : undefined })
    setError(''); setSnapLabel(''); setTool('move')
  }
  const edit = (next: SectionGraphic) => { setDraft(next); setError('') }
  const apply = () => {
    if (!draft) return
    const candidate = { ...section, graphics: section.graphics.some(g => g.id === draft.id) ? section.graphics.map(g => g.id === draft.id ? draft : g) : [...section.graphics, draft] }
    const issues = candidate.graphics.flatMap(g => graphicIssues(g, candidate))
    if (issues.length) { setError([...new Set(issues)].join(' ')); return }
    onChange({ ...candidate, graphics: candidate.graphics.map(g => g.id === draft.id && g.contourLinks?.length ? { ...g, contourSnapshot: resolveGraphicPoints(g, candidate), detachedFromContour: false } : g) }); onSelect(draft.id); setDraft(null); setError('')
  }
  const dragPoint = (id: string, point: XZ, phase: HandlePhase) => {
    if (disabled || !current || mode === 'foundation') return
    if (phase === 'start') {
      revealTool('coordinates')
      const index = id==='line-origin' ? -1 : Number(id.replace('manual-point-', ''))
      if (!Number.isInteger(index) || index!==-1&&!current.points[index]) return
      drag.current = { graphic: current, previous: draft, index }; setDraft(current); setError(''); setSnapLabel(''); return
    }
    const before = drag.current
    if (!before) return
    if (phase === 'cancel') { drag.current = null; setDraft(before.previous); setError(''); setSnapLabel(''); return }
    const origin=before.graphic.points[0]!
    const xs=before.graphic.points.map(p=>p.x),zs=before.graphic.points.map(p=>p.z)
    const dx=Math.max(-Math.min(...xs),Math.min(point.x-origin.x,profileLength(section.profile)-Math.max(...xs)))
    const dz=Math.max(section.bottom-Math.min(...zs),Math.min(point.z-origin.z,section.top-Math.max(...zs)))
    const translated={...before.graphic,points:before.graphic.points.map(p=>({x:p.x+dx,z:p.z+dz}))}
    const result = before.index===-1 ? {graphic:translated,issues:graphicIssues(translated,section),label:'Перенос всей линии'} : moveManualPoint(section, before.graphic, before.index, point, snap)
    if (phase === 'move') { if (!result.issues.length) { setDraft(result.graphic); setSnapLabel(result.label ?? '') } setError(result.issues.join(' ')); return }
    drag.current = null
    if (result.issues.length) { setDraft(before.previous); setError(result.issues.join(' ')); setSnapLabel(''); return }
    const changed = JSON.stringify(result.graphic.points) !== JSON.stringify(before.graphic.points)
    setDraft(changed ? result.graphic : before.previous); setSnapLabel(result.label ?? ''); setError('')
  }
  const remove = () => {
    if (!selected) return
    const children = section.graphics.filter(g => g.parentId === selected.id)
    if (children.length && !window.confirm(`Удалить область «${selected.name}» вместе с внутренними исключениями (${children.length})? Действие можно отменить.`)) return
    onChange({ ...section, graphics: section.graphics.filter(g => g.id !== selected.id && g.parentId !== selected.id) }); onSelect(''); setDraft(null)
  }
  return <section onKeyDown={e => { if (e.key === 'Escape' && draft) { setDraft(null); setError('') } }}><h2>{mode === 'lithology' ? 'Литология' : mode === 'foundation' ? 'Фундамент и разломы' : typeNames[mode]}</h2>
    <GraphHelp>{mode === 'lithology' && <p className="section-muted">Области задаются вручную упорядоченными точками. Назначьте породу и при необходимости добавьте внутреннее исключение без заливки. Скважинные колонки служат опорой; автоматическая корреляция пород не выполняется.</p>}
    {mode === 'foundation' && <p className="section-muted">Разлом задаётся ручной линией. Он не смещает пласты и связанные границы.</p>}</GraphHelp>
    {mode === 'lithology' && !visible.length && !draft && <p role="status">Литологических областей пока нет. Добавьте первую область и задайте её границы.</p>}
    {selection && !selected && !draft && <p className="section-muted">Выбранный объект недоступен в этом режиме. Выберите объект в списке.</p>}
    {!current && <ToolCategory category="coordinates"><p className="section-muted">Выберите или создайте объект в блоке «Работа с объектами», чтобы увидеть координаты его точек.</p></ToolCategory>}
    <div className="section-tool-icon-grid" role="group" aria-label="Создать объект">{types.map(type => <SectionToolButton key={type} icon={typeIcons[type]} label={`Добавить: ${typeNames[type]}`} disabled={disabled || !!draft} onClick={() => start(type)} />)}{mode === 'lithology' && <SectionToolButton icon={CirclePlus} label="Внутреннее исключение" disabled={disabled || !!draft || !selected?.closed || !!selected.parentId} onClick={() => start('lithology', selected!.id)} />}</div><label className="section-actions"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />Привязка к литоконтактам</label>
    <GraphHelp><p className="section-muted">{mode !== 'foundation' ? current ? tool === 'add' ? 'Клик в разрезе добавляет точку. Вернитесь в «Перемещение и точки» для навигации и редактирования.' : 'Перетаскивайте точки или меняйте координаты в таблице. ЛКМ вне точек перемещает график. Примените геометрию; Escape отменяет текущий жест. Стрелки на точке — шаг 0,1 м, Shift + стрелки — 1 м.' : 'Выберите объект в списке, чтобы увидеть его точки.' : draft ? 'Клик в разрезе добавляет точку. Координаты доступны в таблице. Примените геометрию или нажмите Escape для отмены.' : 'Выберите объект в списке для просмотра и редактирования точек.'}</p></GraphHelp>{snapLabel && <ToolCategory category="coordinates"><p role="status" className="section-muted">Привязка: {snapLabel}.</p></ToolCategory>}
    {error && <ToolCategory category="footer"><p role="alert" className="section-error">{error}</p></ToolCategory>}
    {mode !== 'foundation' && <div className="section-tool-icon-grid" role="group" aria-label="Инструмент ручной геометрии"><SectionToolButton icon={Move} label="Перемещение и точки" variant={tool==='move'?'primary':'secondary'} aria-pressed={tool === 'move'} onClick={() => setTool('move')} /><SectionToolButton icon={Plus} label="Добавлять точки" variant={tool==='add'?'primary':'secondary'} aria-pressed={tool === 'add'} disabled={disabled || !current} onClick={() => setTool('add')} /><SectionToolButton icon={Trash2} label="Удалить ближайшую точку" variant={tool==='delete'?'primary':'secondary'} disabled={disabled||!current} aria-pressed={tool==='delete'} onClick={()=>setTool('delete')} /><SectionToolButton icon={MoveUpRight} label="Сместить ближайшую точку" variant={tool==='shift'?'primary':'secondary'} disabled={disabled||!current} aria-pressed={tool==='shift'} onClick={()=>setTool('shift')} />{mode==='oxidation'&&<SectionToolButton icon={MoveHorizontal} label="Перетащить всю линию" variant={tool==='line'?'primary':'secondary'} disabled={disabled||!current} aria-pressed={tool==='line'} onClick={()=>setTool('line')} />}</div>}
    <SectionCanvas showStratigraphy={mode === 'lithology'} section={draft ? { ...section, graphics: [...section.graphics.filter(g => g.id !== draft.id), draft] } : section} graphicTypes={mode === 'lithology' ? ['lithology', 'foundation', 'fault'] : mode === 'oxidation' ? ['oxidation', 'foundation', 'fault'] : ['foundation', 'fault']} layers={mode === 'lithology' ? [] : ['technology', 'ore']} selection={current?.id} onGraphic={draft ? undefined : onSelect} graphicSelectionIds={visible.map(g => g.id)} draft={draft?.points} handles={!disabled && mode !== 'foundation' && tool === 'line' && current ? [{id:'line-origin',label:'Переместить всю линию',point:current.points[0]!,kind:'graphic' as const}] : !disabled && mode !== 'foundation' && tool === 'move' && current ? current.points.map((point, index) => ({ id: `manual-point-${index}`, label: `${current.name}: переместить точку ${index + 1}`, point, kind: 'graphic' as const })) : []} onHandleDrag={!disabled && mode !== 'foundation' && (tool === 'move'||tool==='line') ? dragPoint : undefined} onPoint={current && !disabled && (mode === 'foundation' ? !!draft : ['add','delete','shift'].includes(tool)) ? point => { const s = snap ? snappedPoint(point, section) : { point }; setSnapLabel(s.label ?? ''); const nearest=current.points.map((p,i)=>({i,d:Math.hypot(p.x-point.x,p.z-point.z)})).sort((a,b)=>a.d-b.d)[0]
      if(tool==='delete'&&nearest)edit({...current,points:current.points.filter((_,i)=>i!==nearest.i)})
      else if(tool==='shift'&&nearest){const result=moveManualPoint(section,current,nearest.i,point,snap);if(result.issues.length)setError(result.issues.join(' '));else edit(result.graphic)}
      else {const index=nearestEdge(current.points,s.point,current.closed)?.index??current.points.length;const points=[...current.points];points.splice(index,0,s.point);edit({...current,points})} } : undefined} />
    <label className="section-search">Графический объект<select value={selected?.id ?? ''} disabled={!!draft} onChange={e => onSelect(e.target.value)}><option value="">Выберите объект</option>{visible.map(g => <option key={g.id} value={g.id}>{g.parentId ? '↳ Исключение: ' : ''}{g.name}</option>)}</select></label>
    {current?.parentId && <p className="section-preview">Внутреннее исключение области «{section.graphics.find(g => g.id === current.parentId)?.name}». Контур должен полностью лежать внутри области и не пересекать другие исключения.</p>}
    {current?.detachedFromContour && <p className="section-preview">Граница отсоединена от изменённого контура. Проверьте геометрию и выберите новые дуги при необходимости.</p>}
    {current && <><div className="section-form"><label>Название<input value={current.name} disabled={disabled} onChange={e => edit({ ...current, name: e.target.value })} /></label>{current.type === 'lithology' && !current.parentId && <label>Порода<select value={current.rock ?? 'sand'} disabled={disabled || !!current.parentId} onChange={e => edit({ ...current, rock: e.target.value as SectionGraphic['rock'] })}>{Object.entries(rockNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}<label><input type="checkbox" checked={current.closed} disabled={disabled || current.type === 'lithology'} onChange={e => edit({ ...current, closed: e.target.checked })} />Замкнутая линия</label>{current.type === "oxidation" && <label><input type="checkbox" checked={current.reversed} disabled={disabled} onChange={e => edit({ ...current, reversed: e.target.checked })} />Обратная сторона штрихов</label>}</div>
    {current.type === 'foundation' && <fieldset className="section-checks"><legend>Дуги технологического контура: нижние</legend>{section.links.technology.map(l => <label key={l.id}><input type="checkbox" disabled={disabled} checked={current.contourLinks?.includes(l.id) ?? false} onChange={e => edit({ ...current, points: current.contourLinks?.length ? current.points : [], contourLinks: e.target.checked ? [...(current.contourLinks ?? []), l.id] : current.contourLinks?.filter(id => id !== l.id) })} />{l.a.split('/')[0]} ↔ {l.b.split('/')[0]}</label>)}{!section.links.technology.length && <p>Сначала соедините технологические интервалы.</p>}</fieldset>}
    <ToolCategory category="coordinates">{mode === 'oxidation' && <fieldset className="section-form"><legend>Перенос всей линии</legend><label>Смещение X, м<input type="number" value={Number.isFinite(shiftX) ? shiftX : ''} disabled={disabled} onChange={e => setShiftX(e.target.valueAsNumber)} /></label><label>Смещение Z, м<input type="number" value={Number.isFinite(shiftZ) ? shiftZ : ''} disabled={disabled} onChange={e => setShiftZ(e.target.valueAsNumber)} /></label><Button variant="secondary" disabled={disabled || !Number.isFinite(shiftX) || !Number.isFinite(shiftZ) || shiftX === 0 && shiftZ === 0} onClick={() => { edit({ ...current, points: current.points.map(p => ({ x: p.x + shiftX, z: p.z + shiftZ })) }); setShiftX(0); setShiftZ(0) }}>Перенести линию</Button></fieldset>}
    <div className="section-table-scroll"><table className="section-table"><thead><tr><th>Точка</th><th>X, м</th><th>Z, м</th><th>Порядок</th></tr></thead><tbody>{current.points.map((p, i) => <tr key={i}><th scope="row">{i + 1}</th>{(['x', 'z'] as const).map(key => <td key={key}><input type="number" aria-label={`Точка ${i + 1}, ${key.toUpperCase()}`} step="0.01" value={Number.isFinite(p[key]) ? p[key] : ""} disabled={disabled} onChange={e => edit({ ...current, points: current.points.map((a, j) => j === i ? { ...a, [key]: e.target.valueAsNumber } : a) })} /></td>)}<td><Button variant="quiet" aria-label={`Поднять точку ${i + 1}`} disabled={disabled || i === 0} onClick={() => { const points = [...current.points]; [points[i - 1], points[i]] = [points[i]!, points[i - 1]!]; edit({ ...current, points }) }}>↑</Button><Button className="action-delete action-delete--icon" size="sm" variant="quiet" aria-label={`Удалить точку ${i + 1}`} disabled={disabled} onClick={() => edit({ ...current, points: current.points.filter((_, j) => j !== i) })}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div>
    <div className="section-actions"><Button variant="secondary" disabled={disabled} onClick={() => { const last = current.points.at(-1) ?? { x: 0, z: section.top }; const point: XZ = { x: Math.min(profileLength(section.profile), last.x + 5), z: Math.max(section.bottom, last.z - 1) }; edit({ ...current, points: [...current.points, point] }) }}>Добавить точку</Button><Button variant="secondary" disabled={disabled} onClick={() => edit({ ...current, points: [...current.points].reverse() })}>Развернуть порядок</Button><Button variant="secondary" disabled={disabled || !!current.contourLinks?.length || current.points.length < 3} onClick={() => edit({ ...current, smooth: !current.smooth })}>{current.smooth ? 'Спрямить линию' : 'Сгладить линию'}</Button></div></ToolCategory><ToolCategory category="footer"><div className="section-actions"><Button disabled={disabled || !draft} onClick={apply}>Применить геометрию</Button><Button variant="quiet" disabled={!draft} onClick={() => { setDraft(null); setError('') }}>Отменить правки геометрии</Button></div></ToolCategory><Button className="action-delete" size="sm" variant="quiet" disabled={disabled || !!draft || !selected} onClick={remove}><Trash2 size={15} />Удалить объект</Button></>}
  </section>
}

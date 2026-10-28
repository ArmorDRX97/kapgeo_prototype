import { useState } from 'react'
import { z } from 'zod'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'
import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import '../../../features/geology-data/data-workbench.css'
import './bgd-stratigraphy.css'

const schema = z.object({ id:z.string(), from:z.number().finite(), to:z.number().finite(), age:z.string().max(100), name:z.string().max(120) })
type Interval = z.infer<typeof schema>
const seed = (depth:number):Interval[] => [{id:'example-1',from:0,to:Math.round(depth*.7*10)/10,age:'Пример · K₂',name:'Вмещающие отложения'},{id:'example-2',from:Math.round(depth*.7*10)/10,to:depth,age:'Пример · K₂',name:'Продуктивный горизонт'}]
function validate(rows:Interval[], depth:number) {
  const ordered=[...rows].sort((a,b)=>a.from-b.from)
  return rows.some(r=>!schema.safeParse(r).success || r.from<0 || r.to>depth || r.to<=r.from || !r.age.trim() || !r.name.trim()) ? 'Укажите возраст, название и корректные глубины в пределах ствола.' : ordered.some((r,i)=>i>0 && r.from<ordered[i-1]!.to) ? 'Интервалы перекрываются. Уточните глубины.' : ''
}
export function BgdStratigraphyTab({ wellId, depth, canEdit, onDirtyChange }: {wellId:string;depth:number;canEdit:boolean;onDirtyChange?:(dirty:boolean)=>void}) {
  const key=`kapgeo.bgd.stratigraphy.v1.${wellId}`
  const [rows,setRows]=useState<Interval[]>(()=>{try {const saved=z.array(schema).max(200).parse(JSON.parse(localStorage.getItem(key)??'null'));return validate(saved,depth)?seed(depth):saved}catch{return seed(depth)}})
  const [baseline,setBaseline]=useState(rows),[selected,setSelected]=useState(rows[0]?.id??''),[notice,setNotice]=useState('')
  const row=rows.find(r=>r.id===selected),dirty=JSON.stringify(rows)!==JSON.stringify(baseline),error=validate(rows,depth)
  const save=()=>{if(error||!canEdit)return false;try{localStorage.setItem(key,JSON.stringify(rows));setBaseline(rows);setNotice('Стратиграфия сохранена в этом браузере');return true}catch{setNotice('Не удалось сохранить данные');return false}}
  useReportUnsavedChanges(dirty,onDirtyChange,{discard:()=>setRows(baseline),save:async()=>save()})
  const patch=(next:Partial<Interval>)=>{setNotice('');setRows(rows.map(r=>r.id===selected?{...r,...next}:r))}
  return <div className="data-workbench bgd-stratigraphy"><Panel title="Стратиграфия скважины" description="Учебный пример подразделений. Уточните глубины, возраст и наименование; справочник требует согласования.">
    <div className="data-actions"><Button disabled={!canEdit} onClick={()=>{const end=Math.max(0,...rows.map(r=>r.to)),from=end<depth?end:0,item={id:crypto.randomUUID(),from,to:Math.min(depth,from+1),age:'',name:''};setRows([...rows,item]);setSelected(item.id)}}>Добавить подразделение</Button><Button variant="secondary" disabled={!dirty} onClick={()=>{setRows(baseline);setNotice('Изменения отменены')}}>Отменить</Button><Button disabled={!canEdit || !dirty || !!error} onClick={save}>Сохранить стратиграфию</Button></div>
    {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
    <div className="data-scroll"><table><caption>Нажмите строку, чтобы выбрать подразделение</caption><thead><tr><th>Кровля, м</th><th>Подошва, м</th><th>Возраст</th><th>Наименование</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className={r.id===selected?'is-selected':''} tabIndex={0} aria-current={r.id===selected?'true':undefined} onClick={()=>setSelected(r.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(r.id)}}}><td>{r.from}</td><td>{r.to}</td><td>{r.age}</td><td>{r.name}</td></tr>)}</tbody></table></div>
  </Panel>{row&&<Panel title="Свойства подразделения"><fieldset disabled={!canEdit} className="data-fields"><label>Кровля, м<input type="number" value={Number.isFinite(row.from)?row.from:''} onChange={e=>patch({from:e.target.valueAsNumber})} /></label><label>Подошва, м<input type="number" value={Number.isFinite(row.to)?row.to:''} onChange={e=>patch({to:e.target.valueAsNumber})} /></label><label>Возраст<input value={row.age} onChange={e=>patch({age:e.target.value})} /></label><label>Наименование<input value={row.name} onChange={e=>patch({name:e.target.value})} /></label><Button variant="quiet" onClick={()=>{setRows(rows.filter(r=>r.id!==row.id));setSelected('')}}>Удалить подразделение</Button></fieldset></Panel>}</div>
}

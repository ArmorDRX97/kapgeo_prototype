import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Check, Columns3, Maximize, Plus, Redo2, RotateCcw, Trash2, Undo2, UnfoldHorizontal, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Switch } from '../../shared/ui/Switch'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { ExportDialog, type ExportFormat } from './PassportDialogs'
import { PassportInspector } from './PassportInspector'
import { PassportIconButton, PassportToolbar } from './PassportToolbar'
import { download, rasterSheet } from './documentActions'
import { composeReferenceSvg, loadReferenceSettings, referenceColumns, referenceDefaults, referenceSize, referenceStorageKey, type ReferenceColumnId, type ReferenceSettings } from './referenceModel'
import raw22 from './assets/127cd.svg?raw'
import raw231 from './assets/127cd-2.svg?raw'
import './passport.css'

type Dialog = 'add'|'template'|'export'|'info'|'help'|'legend'|ReferenceColumnId|null
export function ReferencePassportWorkbench({ id }:{id:'127-2-2'|'127-2-3-1'}) {
 const name=id==='127-2-2'?'127СВ-2-2':'127СВ-2-3-1', raw=id==='127-2-2'?raw22:raw231
 const [settings,setSettings]=useState(()=>loadReferenceSettings(id)),[past,setPast]=useState<ReferenceSettings[]>([]),[future,setFuture]=useState<ReferenceSettings[]>([])
 const [right,setRight]=useState(() => window.innerWidth >= 900),[dialog,setDialog]=useState<Dialog>(null),[error,setError]=useState('')
 const [zoom,setZoom]=useState<number|'width'|'page'>('width'),[viewport,setViewport]=useState({width:1200,height:800})
 const [from,setFrom]=useState(String(settings.from)),[to,setTo]=useState(String(settings.to))
 const stage=useRef<HTMLDivElement>(null),size=referenceSize(settings)
 const source=useMemo(()=>composeReferenceSvg(raw,settings),[raw,settings]), image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source)
 const width=zoom==='width'?viewport.width-48:zoom==='page'?Math.min(viewport.width-48,(viewport.height-48)*size.width/size.height):size.width/40*zoom/100
 const percent=Math.round(width/(size.width/40)*100)
 const persist=(next:ReferenceSettings)=>{setSettings(next);setFrom(String(next.from));setTo(String(next.to));try{localStorage.setItem(referenceStorageKey(id),JSON.stringify(next));setError('')}catch{setError('Изменения отображаются, но не сохранены в браузере.')}}
 const patch=(values:Partial<ReferenceSettings>)=>{const next={...settings,...values};if(JSON.stringify(next)===JSON.stringify(settings))return;setPast(p=>[...p.slice(-19),settings]);setFuture([]);persist(next)}
 const undo=()=>{const previous=past.at(-1);if(previous){setPast(p=>p.slice(0,-1));setFuture(f=>[settings,...f]);persist(previous)}}
 const redo=()=>{const next=future[0];if(next){setPast(p=>[...p,settings]);setFuture(f=>f.slice(1));persist(next)}}
 const move=(index:number,by:number)=>{const columns=[...settings.columns];[columns[index],columns[index+by]]=[columns[index+by]!,columns[index]!];patch({columns})}
 const valid=from.trim()!==''&&to.trim()!==''&&Number.isFinite(Number(from))&&Number.isFinite(Number(to))&&Number(from)>=647.1&&Number(to)<=712.6&&Number(to)>Number(from)
 const title=referenceColumns.find(c=>c.id===dialog)?.name
 useEffect(()=>{const el=stage.current;if(!el)return;const observer=new ResizeObserver(([entry])=>{if(entry)setViewport({width:entry.contentRect.width,height:entry.contentRect.height})});observer.observe(el);return()=>observer.disconnect()},[])
 const icon=(label:string,child:ReactElement,action:()=>void,disabled=false)=><PassportIconButton label={label} onClick={action} disabled={disabled}>{child}</PassportIconButton>
 const exportDocument=async(format:ExportFormat)=>{
  if(format==='pdf'){window.print();return}
  if(format==='svg')download(new Blob([source],{type:'image/svg+xml;charset=utf-8'}),`${name}-паспорт.svg`)
  else if(format==='png'||format==='jpeg')download(await rasterSheet(source,format),`${name}-паспорт.${format==='jpeg'?'jpg':'png'}`)
  else {
   const rows:string[][]=[['Паспорт',name],['Интервал, м',`${settings.from}–${settings.to}`],['Масштаб',`1:${settings.scale}`],['Составил',settings.author],['Дата',settings.date],['Колонка','Подпись из исходного документа']]
   const doc=new DOMParser().parseFromString(raw,'image/svg+xml')
   for(const columnId of settings.columns){const c=referenceColumns.find(c=>c.id===columnId)!;for(const text of doc.querySelectorAll('text')){const m=text.getAttribute('transform')?.match(/translate\(([-\d.]+),\s*([-\d.]+)/);if(m&&Number(m[1])>=c.from&&Number(m[1])<c.to&&Number(m[2])>=14000)rows.push([c.name,text.textContent??''])}}
   const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
   const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Паспорт"><Table>${rows.map(row=>`<Row>${row.map(cell=>`<Cell><Data ss:Type="String">${escape(cell)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`
   download(new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'}),`${name}-паспорт.xls`)
  }
 }
 return <div className="passport-workbench passport-reference-workbench">
  <div className="passport-workspace">
   <section className="passport-document" aria-label="Предпросмотр паспорта">
    <PassportToolbar unsaved={!!error} onPrint={()=>window.print()} onExport={()=>setDialog('export')} onInfo={()=>setDialog('info')} onHelp={()=>setDialog('help')}
     view={<>
      {icon('Уменьшить предпросмотр',<ZoomOut size={17} aria-hidden="true"/>,()=>setZoom(Math.max(10,percent-10)),percent<=10)}
      <span className="passport-zoom-value" aria-label="Увеличение предпросмотра">{percent}%</span>
      {icon('Увеличить предпросмотр',<ZoomIn size={17} aria-hidden="true"/>,()=>setZoom(Math.min(250,percent+10)),percent>=250)}
      <PassportIconButton label="Вписать по ширине" pressed={zoom==='width'} onClick={()=>setZoom('width')}><UnfoldHorizontal size={17} aria-hidden="true"/></PassportIconButton>
      <PassportIconButton label="Показать лист целиком" pressed={zoom==='page'} onClick={()=>setZoom('page')}><Maximize size={17} aria-hidden="true"/></PassportIconButton>
     </>}
     actions={<>
      {icon('Отменить изменение',<Undo2 size={17} aria-hidden="true"/>,undo,!past.length)}
      {icon('Повторить изменение',<Redo2 size={17} aria-hidden="true"/>,redo,!future.length)}
      {icon('Добавить колонку',<Columns3 size={17} aria-hidden="true"/>,()=>setDialog('add'))}
     </>}
    >
    <div className="passport-document-context"><div className="passport-document-details"><h1>{name}</h1><span className="passport-well-purpose">Геологическая колонка</span><span>{settings.from}–{settings.to} м</span><span>1:{settings.scale}</span></div><span>{Math.round(size.width/100)} × {Math.round(size.height/100)} мм</span></div>
    {error&&<div className="passport-storage-error" role="alert">{error}</div>}
    <div ref={stage} className="passport-preview-scroll"><div className="passport-paper-wrap" style={{width:Math.max(160,width)}}><img className="reference-document-image" src={image} alt={`Паспорт ${name}: ${settings.columns.map(id=>referenceColumns.find(c=>c.id===id)!.name).join(', ')}`}/></div></div>
    <div className="passport-preview-footer"><span>Колонок: {settings.columns.length}</span><span>Лист 1 из 1</span><span>{settings.from}–{settings.to} м</span></div>
    </PassportToolbar>
   </section>
   <PassportInspector open={right} onToggle={()=>setRight(open=>!open)}><div className="passport-settings-scroll">
    <div className="passport-settings-section"><div className="passport-setting-heading"><h3>Геологическая колонка</h3></div><p className="passport-muted">Интервал, состав колонок и оформление листа.</p><div className="data-actions"><Button size="sm" variant="secondary" onClick={()=>setDialog('template')}>Шаблон</Button><Button size="sm" variant="quiet" onClick={()=>patch(referenceDefaults())}><RotateCcw size={14}/>Исходный вид</Button></div></div>
    <div className="passport-settings-section"><form className="passport-range" onSubmit={e=>{e.preventDefault();if(valid)patch({from:Number(from),to:Number(to)})}}><div className="passport-setting-heading"><h3>Интервал глубин</h3><span>м</span></div><div className="passport-range-fields"><label><span>От</span><input aria-label="Паспорт: от, м" type="number" step="0.1" value={from} onChange={e=>setFrom(e.target.value)}/></label><span>—</span><label><span>До</span><input aria-label="Паспорт: до, м" type="number" step="0.1" value={to} onChange={e=>setTo(e.target.value)}/></label></div>{!valid&&<p className="passport-error" role="alert">Задайте интервал в пределах 647,1–712,6 м.</p>}{(Number(from)!==settings.from||Number(to)!==settings.to)&&<Button type="submit" size="sm" disabled={!valid}>Применить интервал</Button>}<div className="passport-range-presets"><button type="button" onClick={()=>patch({from:647.1,to:712.6})}>Весь лист</button></div></form><div className="passport-setting-heading"><h3>Масштаб документа</h3></div><div className="passport-segmented" role="group" aria-label="Масштаб документа">{([50,100,200] as const).map(scale=><button type="button" key={scale} aria-pressed={settings.scale===scale} onClick={()=>patch({scale})}>1:{scale}</button>)}</div></div>
    <div className="passport-settings-section"><div className="passport-setting-heading"><h3>Состав колонок</h3><Button size="sm" variant="quiet" aria-label="Добавить колонку" onClick={()=>setDialog('add')}><Plus size={16}/></Button></div><div className="reference-column-list">{settings.columns.map((id,index)=><div key={id}><button type="button" className="reference-column-name" onClick={()=>setDialog(id)}>{referenceColumns.find(c=>c.id===id)!.name}</button><div>{icon(`Поднять: ${id}`,<ArrowUp size={13}/>,()=>move(index,-1),index===0)}{icon(`Опустить: ${id}`,<ArrowDown size={13}/>,()=>move(index,1),index===settings.columns.length-1)}<Button variant="quiet" size="sm" className="reference-column-delete" aria-label={`Убрать: ${referenceColumns.find(c=>c.id===id)!.name}`} disabled={settings.columns.length===1} onClick={()=>patch({columns:settings.columns.filter(c=>c!==id)})}><Trash2 size={14}/></Button></div></div>)}</div></div>
    <div className="passport-settings-section"><Button size="sm" variant="secondary" onClick={()=>setDialog('legend')}>Условные обозначения</Button><Switch label="Сетка глубин и значений" checked={settings.grid} onChange={grid=>patch({grid})}/><div className="passport-segmented" role="group" aria-label="Цвет паспорта"><button type="button" aria-pressed={settings.color} onClick={()=>patch({color:true})}>Цветной</button><button type="button" aria-pressed={!settings.color} onClick={()=>patch({color:false})}>Чёрно-белый</button></div></div>
    <div className="passport-settings-section"><div className="passport-setting-heading"><h3>Реквизиты документа</h3></div><label className="passport-field"><span>Составил</span><input value={settings.author} maxLength={60} onChange={e=>patch({author:e.target.value})}/></label><label className="passport-field"><span>Дата</span><input type="date" value={settings.date} onChange={e=>patch({date:e.target.value})}/></label></div>
   </div><div className="passport-settings-footer"><Check size={14}/><span>{error?'Изменения не сохранены':'Настройки сохраняются автоматически'}</span></div></PassportInspector>
  </div>
  {dialog==='export'&&<ExportDialog well={{name}} page={1} count={1} sheetLabel={`${Math.round(size.width/100)} × ${Math.round(size.height/100)} мм`} excelDetail="Состав документа и подписи выбранных колонок" onExport={exportDocument} onClose={()=>setDialog(null)}/>}
  {dialog==='add'&&<WorkspaceDialog title="Добавить колонку" size="compact" onClose={()=>setDialog(null)} footer={<Button variant="secondary" onClick={()=>setDialog(null)}>Закрыть</Button>}><div className="reference-add-columns">{referenceColumns.filter(c=>!settings.columns.includes(c.id)).map(c=><Button key={c.id} variant="secondary" onClick={()=>{patch({columns:[...settings.columns,c.id]});setDialog(null)}}><Plus size={15}/>{c.name}</Button>)}{settings.columns.length===referenceColumns.length&&<p>Все колонки уже добавлены. Их порядок и состав меняются в настройках паспорта.</p>}</div></WorkspaceDialog>}
  {dialog==='template'&&<WorkspaceDialog title="Шаблон паспорта" size="compact" onClose={()=>setDialog(null)} footer={<Button variant="secondary" onClick={()=>setDialog(null)}>Отмена</Button>}><div className="reference-add-columns">{[['Полный паспорт',referenceColumns.map(c=>c.id)],['Геология и ГИС',['logging-geology','horizon','depth','curves','description','construction']],['Опробование',['samples','ore','coordinates','description']]].map(([label,ids])=><Button key={String(label)} variant="secondary" onClick={()=>{patch({columns:ids as ReferenceColumnId[]});setDialog(null)}}>{String(label)}</Button>)}</div></WorkspaceDialog>}
  {dialog==='info'&&<WorkspaceDialog title={`Сведения о скважине ${name}`} onClose={()=>setDialog(null)} footer={<Button variant="secondary" onClick={()=>setDialog(null)}>Закрыть</Button>}><dl className="passport-facts">{[['Скважина',name],['Месторождение','Буденовское'],['Блок','127св'],['Документ','Геологическая колонка рудовмещающего горизонта'],['Интервал листа','647,1–712,6 м'],['Масштаб',`1:${settings.scale}`]].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></WorkspaceDialog>}
  {dialog==='help'&&<WorkspaceDialog title="Как работать с паспортом" onClose={()=>setDialog(null)} footer={<Button variant="secondary" onClick={()=>setDialog(null)}>Понятно</Button>}><ol className="passport-help"><li>Выберите паспорт в левом меню.</li><li>Задайте интервал глубин и масштаб в настройках справа.</li><li>Добавляйте и убирайте колонки, меняйте их порядок стрелками. Нажмите на название для просмотра.</li><li>Для возврата используйте отмену/повтор или «Исходный вид».</li><li>Печать и экспорт используют текущее оформление листа.</li></ol></WorkspaceDialog>}
  {dialog==='legend'&&<WorkspaceDialog title="Условные обозначения" onClose={()=>setDialog(null)} footer={<Button variant="secondary" onClick={()=>setDialog(null)}>Закрыть</Button>}><p>Обозначения пород, опробования и графиков приведены в заголовках соответствующих колонок паспортного листа.</p><div className="reference-add-columns">{referenceColumns.filter(c=>settings.columns.includes(c.id)).map(c=><Button variant="secondary" key={c.id} onClick={()=>setDialog(c.id)}>{c.name}</Button>)}</div></WorkspaceDialog>}
  {title&&<WorkspaceDialog title={title} onClose={()=>setDialog(null)} footer={<Button variant="secondary" onClick={()=>setDialog(null)}>Закрыть</Button>}><div className="reference-column-preview"><svg viewBox={`${referenceColumns.find(c=>c.id===dialog)!.from} 14000 ${referenceColumns.find(c=>c.id===dialog)!.to-referenceColumns.find(c=>c.id===dialog)!.from} 137000`} style={{width:'100%',height:650}}><image href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(raw)} width="63800" height="153000"/></svg></div></WorkspaceDialog>}
  {createPortal(<div className="reference-passport-print"><style>{`@media print { @page reference-column { size:${size.width/100}mm ${size.height/100}mm; margin:0; } }`}</style><img src={image} style={{width:`${size.width/100}mm`,height:`${size.height/100}mm`}} alt={`Паспорт ${name}`}/></div>,document.body)}
 </div>
}

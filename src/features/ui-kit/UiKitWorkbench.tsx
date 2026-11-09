import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Bell, BookOpen, ChartNoAxesCombined, Check, ChevronRight, Layers3, LayoutDashboard, Map, MousePointer2, Palette, PanelsTopLeft, RectangleEllipsis, RotateCcw, Search, Table2, TextCursorInput, Type, X } from 'lucide-react'
import { BrandMark } from '../../shared/ui/BrandMark'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { Badge } from '../../shared/ui/Badge'
import { kitSections, type KitSection } from './model'
import { Colors, Typography } from './Foundations'
import { Buttons, Forms, Navigation } from './Controls'
import { Dialogs } from './Dialogs'
import { Tables } from './Tables'
import { Feedback } from './Feedback'
import { Geology } from './DataExamples'
import { Layouts } from './Layouts'
import './ui-kit.css'

const icons = { overview:LayoutDashboard,colors:Palette,typography:Type,buttons:MousePointer2,forms:TextCursorInput,navigation:Layers3,dialogs:RectangleEllipsis,tables:Table2,feedback:Bell,geology:Map,layouts:PanelsTopLeft }
export function UiKitWorkbench({section,onSection,onBack}:{section:KitSection;onSection:(id:KitSection)=>void;onBack:()=>void}) {
  const [query,setQuery]=useState(''),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[resetOpen,setResetOpen]=useState(false)
  const main=useRef<HTMLElement>(null)
  const current=kitSections.find(s=>s.id===section)!
  const visible=kitSections.filter(s=>`${s.title} ${s.keywords}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  useEffect(()=>{
    const previous=document.title;document.title=`${current.title} · UI Kit KAPGEO`
    main.current?.scrollTo?.({top:0})
    return ()=>{document.title=previous}
  },[current.title])
  const notify=(message:string)=>setNotice(message)
  return <div className="uik-root"><a className="skip-link" href="#ui-kit-main">Перейти к компонентам</a><header className="uik-header"><div className="uik-brand"><BrandMark/><div><strong>KAPGEO <span>/ UI Kit</span></strong><small>Библиотека интерфейса</small></div></div><span className="uik-team-label">TEAM · DESIGN</span><div className="uik-header-actions"><Button variant="secondary" size="sm" onClick={()=>setResetOpen(true)}><RotateCcw size={15}/>Сбросить примеры</Button><Button variant="quiet" size="sm" onClick={onBack}><ArrowLeft size={16}/>В профиль</Button></div></header>
    <aside className="uik-sidebar"><label className="uik-search"><Search size={16}/><input aria-label="Поиск категории UI Kit" placeholder="Найти категорию…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Очистить поиск категорий" onClick={()=>setQuery('')}><X size={14}/></button>}</label><nav aria-label="Категории UI Kit">{['Начало','Основы','Компоненты','Данные','Компоновки'].map(group=>{const items=visible.filter(s=>s.group===group);return items.length>0&&<div className="uik-nav-group" key={group}><h2>{group}</h2>{items.map(s=>{const Icon=icons[s.id];return <button type="button" key={s.id} aria-current={s.id===section?'page':undefined} onClick={()=>onSection(s.id)}><Icon size={17}/><span>{s.title}</span>{s.id===section&&<ChevronRight size={15}/>}</button>})}</div>})}{!visible.length&&<p className="uik-caption">Категория не найдена. Попробуйте «таблицы» или «поля».</p>}</nav><footer><BookOpen size={16}/><span>Компоненты приложения<br/><small>Интерактивные примеры</small></span></footer></aside>
    <main id="ui-kit-main" className="uik-main" ref={main} tabIndex={-1}><div className="uik-page-heading"><div><p className="uik-eyebrow">UI Kit / {current.group}</p><h1>{current.title}</h1><p>{current.description}</p></div><Badge>{String(kitSections.findIndex(s=>s.id===section)+1).padStart(2,'0')} / {kitSections.length}</Badge></div>
      <div key={`${section}-${revision}`}>
        {section==='overview'&&<Overview onSection={onSection}/>}
        {section==='colors'&&<Colors notify={notify}/>}
        {section==='typography'&&<Typography/>}
        {section==='buttons'&&<Buttons notify={notify}/>}
        {section==='forms'&&<Forms/>}
        {section==='navigation'&&<Navigation notify={notify}/>}
        {section==='dialogs'&&<Dialogs notify={notify}/>}
        {section==='tables'&&<Tables notify={notify}/>}
        {section==='feedback'&&<Feedback/>}
        {section==='geology'&&<Geology notify={notify}/>}
        {section==='layouts'&&<Layouts notify={notify}/>}
      </div><footer className="uik-page-footer">KAPGEO · UI Kit <span>Настройки примеров действуют только в этой рабочей области.</span></footer>
    </main>
    {notice&&<div className="uik-toast" role="status"><Check size={18}/><span>{notice}</span><button aria-label="Закрыть уведомление UI Kit" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    {resetOpen&&<WorkspaceDialog title="Сбросить примеры?" size="compact" onClose={()=>setResetOpen(false)} footer={<><Button variant="secondary" onClick={()=>setResetOpen(false)}>Отмена</Button><Button onClick={()=>{setRevision(revision+1);setResetOpen(false);setNotice('Примеры текущей категории сброшены')}}>Сбросить</Button></>}><p>Поля, выбранные строки и настройки текущей категории вернутся в исходное состояние. Данные других разделов системы не изменятся.</p></WorkspaceDialog>}
  </div>
}
function Overview({onSection}:{onSection:(id:KitSection)=>void}) {
  return <div className="uik-stack"><section className="uik-intro"><div><span className="uik-eyebrow">Дизайн в действии</span><h2>От элемента<br/>к рабочей области</h2><p>Сравнивайте состояния, открывайте окна и собирайте представление о том, как устроен интерфейс.</p><div className="uik-row"><Button onClick={()=>onSection('buttons')}>Посмотреть компоненты<ArrowUpRight size={16}/></Button><Button variant="secondary" onClick={()=>onSection('layouts')}>Открыть компоновки</Button></div></div><div className="uik-intro-art" aria-hidden="true"><div className="uik-art-top"><i/><i/><i/></div><div className="uik-art-body"><div><span/><span/><span/></div><div><b/><div className="uik-art-rows"><i/><i/><i/></div><svg viewBox="0 0 230 64"><path d="M0 50 20 48 40 52 62 38 80 42 100 25 120 34 146 15 162 25 183 12 205 20 230 5" fill="none" stroke="#455a90" strokeWidth="2.5"/></svg></div></div><span className="uik-art-badge"><Check size={14}/>Единый визуальный язык</span></div></section>
    <div className="uik-overview-grid">{kitSections.filter(s=>s.id!=='overview').map(s=>{const Icon=icons[s.id];return <button key={s.id} onClick={()=>onSection(s.id)}><span className="uik-category-icon"><Icon size={22}/></span><span><small>{s.group}</small><strong>{s.title}</strong><p>{s.description}</p></span><ArrowUpRight size={18}/></button>})}</div>
    <div className="uik-guidance"><ChartNoAxesCombined size={22}/><div><strong>Все примеры можно исследовать</strong><p>Кнопки и меню реагируют на нажатия. В формах можно вводить данные, в таблицах — выбирать строки. «Сбросить примеры» возвращает текущую категорию к началу.</p></div></div>
  </div>
}

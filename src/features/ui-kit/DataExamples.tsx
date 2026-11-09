import { useState } from 'react'
import { Expand, Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Switch } from '../../shared/ui/Switch'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { useMapFullscreen } from '../../shared/lib/useMapFullscreen'
import { MapCanvas } from '../../entities/geology-map/ui/MapCanvas'
import { MapObjectPopup, type MapContextPoint } from '../../entities/geology-map/ui/MapObjectPopup'
import { emptyMap } from '../../entities/geology-map/fixtures'
import type { MapObject } from '../../entities/geology-map/model'
import type { Camera } from '../../entities/geology-map/geometry'
import { AnomalyLogChart } from '../geobase/ui/AnomalyLogChart'
import { createAnomalyRows } from '../geobase/model/bgdAnomalies'
import '../geobase/ui/anomalies.css'
import { Example, Field, type Notify } from './kitParts'
import { columnRockSymbols, sectionRockSymbols, geologyHatchStyle } from '../../shared/scientific/geology/standard16'

const kitChartRows=createAnomalyRows(360)
const mapProject=emptyMap('UI-KIT-MAP','Участок А')
mapProject.objects=Array.from({length:16},(_,i):MapObject=>({id:`kit-map-${i}`,name:`СК-${String(i+1).padStart(3,'0')}`,kind:'well',layerId:'UI-KIT-MAP-base',shape:'straight',closed:false,
  parts:[{id:`part-${i}`,nodes:[{id:`node-${i}`,x:1000+Math.floor(i/4)*45,y:2000+(i%4)*45},{id:`bottom-${i}`,x:1002+Math.floor(i/4)*45,y:2003+(i%4)*45}]}],
  style:{stroke:'#243d7c',fill:'#243d7c',width:1,paperWidth:.15,dash:'solid',opacity:1},label:{visible:true,dx:8,dy:-8},attributes:{type:i%2?'Закачная':'Откачная',depth:360,value:0,note:''},
}))
const noop=()=>{}
export function MiniMap({notify}:{notify:Notify}) {
  const [camera,setCamera]=useState<Camera|null>(null),[selected,setSelected]=useState('kit-map-0'),[context,setContext]=useState<{id:string;at:MapContextPoint}|null>(null),[grid,setGrid]=useState(true),[labels,setLabels]=useState(true)
  const fullscreen=useMapFullscreen()
  const [cardId,setCardId]=useState('')
  const card=mapProject.objects.find(w=>w.id===cardId)
  return <div className={`uik-map${fullscreen.active?' map-is-fullscreen':''}`}><div className="uik-map-toolbar"><span>Участок А · 16 скважин</span><div className="uik-row"><Button size="sm" variant="quiet" aria-label="Приблизить пример карты" onClick={()=>camera&&setCamera({...camera,scale:Math.min(20,camera.scale*1.3)})}><Plus size={16}/></Button><Button size="sm" variant="quiet" aria-label="Отдалить пример карты" onClick={()=>camera&&setCamera({...camera,scale:Math.max(.1,camera.scale/1.3)})}><Minus size={16}/></Button><Button size="sm" variant="quiet" aria-label="Вписать пример карты" onClick={()=>setCamera(null)}><Maximize2 size={16}/></Button><Button size="sm" variant="quiet" aria-label={fullscreen.active?'Свернуть пример карты':'Развернуть пример карты'} onClick={fullscreen.toggle}>{fullscreen.active?<Minimize2 size={16}/>:<Expand size={16}/>}</Button></div></div>
    <div className="uik-map-canvas"><MapCanvas project={mapProject} camera={camera} onCamera={setCamera} selected={selected} editable={false} tool="select" draft={null} grid={grid} labels={labels} values={false} measure={[]} topography={false} hideDemoLabel snap={p=>p} onSelect={ids=>{if(ids[0])setSelected(ids[0]);setContext(null)}} onContextSelect={(ids,at)=>setContext(ids[0]?{id:ids[0],at}:null)} onDraft={noop} onPoint={noop} onNode={noop} onCancel={()=>setContext(null)}/></div>
    <div className="uik-map-settings"><Switch label="Сетка" checked={grid} onChange={setGrid}/><Switch label="Подписи" checked={labels} onChange={setLabels}/><span>Выбрана {mapProject.objects.find(w=>w.id===selected)?.name ?? '—'} · ПКМ — сведения</span></div>
    {context&&<MapObjectPopup objects={mapProject.objects.filter(w=>w.id===context.id)} at={context.at} onClose={()=>setContext(null)} getStatus={()=>'Работает'} onOpenWell={id=>{setSelected(id);setContext(null);setCardId(id);notify('Открыта карточка примера')}}/>}
    {card&&<WorkspaceDialog title={`Карточка скважины ${card.name}`} onClose={()=>setCardId('')} footer={<Button onClick={()=>setCardId('')}>Понятно</Button>}><div className="uik-fields"><Field label="Скважина"><input value={card.name} readOnly/></Field><Field label="Тип"><input value={card.attributes.type} readOnly/></Field><Field label="Глубина, м"><input value={card.attributes.depth} readOnly/></Field><Field label="X, м"><input value={card.parts[0]!.nodes[0]!.x} readOnly/></Field><Field label="Y, м"><input value={card.parts[0]!.nodes[0]!.y} readOnly/></Field><Field label="Статус"><input value="Работает" readOnly/></Field></div></WorkspaceDialog>}
  </div>
}
export function LogChart() {
  const [selected,setSelected]=useState(kitChartRows[0]!.id)
  return <AnomalyLogChart depth={360} rows={kitChartRows} selected={selected} onSelect={setSelected}/>
}
export function Geology({notify}:{notify:Notify}) {
  const [selected,setSelected]=useState(0)
  const rocks = [
    { name: 'Глина', rock: 'clay', from: 0, to: 120 },
    { name: 'Песок среднезернистый', rock: 'sand', from: 120, to: 240 },
    { name: 'Алевролит', rock: 'silt', from: 240, to: 360 },
  ] as const
  return <div className="uik-stack">
    <Example title="Карта и сведения об объекте" description="Знаки фактических скважин из таблицы 4. ЛКМ — выбор, ПКМ — окно координат."><MiniMap notify={notify} /></Example>
    <Example title="Совмещённые диаграммы каротажа" description="Действующий график АП: масштаб, глубинный курсор, выбор пересечения и включение кривых."><LogChart /></Example>
    <Example title="Литологическая колонка и крап по СТ НАК 16-2026" description="Сравните коды и крап колонки 1:200 с обозначениями тех же пород на разрезе.">
      <div className="uik-lithology">
        <div className="uik-depth-column">{rocks.map((row, i) => {
          const symbol = columnRockSymbols[row.name]!
          return <button key={row.name} aria-pressed={selected === i} onClick={() => setSelected(i)} style={geologyHatchStyle(symbol.pattern, '#ffffff')}>
            <span>{row.from}–{row.to} м</span><strong>{row.name} · {symbol.code}</strong>
          </button>
        })}</div>
        <div className="uik-stack-small">
          <strong>Колонка 1:200 · таблица 1, графа 5</strong>
          {rocks.map((row, i) => {
            const symbol = columnRockSymbols[row.name]!
            return <button key={row.name} className="uik-legend-item" aria-pressed={selected === i} onClick={() => setSelected(i)}>
              <i style={geologyHatchStyle(symbol.pattern, '#ffffff')} />{row.name}<small>Код {symbol.code} · с. {symbol.page}</small>
            </button>
          })}
          <strong>Разрез · таблица 1, графа 8 и таблица 6</strong>
          {rocks.map(row => {
            const symbol = sectionRockSymbols[row.rock]
            return <div key={row.name} className="uik-legend-item"><i style={geologyHatchStyle(symbol.pattern, symbol.color)} />{row.name}<small>Код {symbol.code}</small></div>
          })}
        </div>
      </div>
    </Example>
  </div>
}

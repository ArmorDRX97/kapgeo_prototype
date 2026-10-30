import { defaultMapGrid, gridSchema, type MapGrid, type MapObject } from '../../entities/geology-map/model'
import { WellTypeFilters } from '../../entities/geology-map/ui/WellTypeFilters'
import { Button } from '../../shared/ui/Button'
import { Switch } from '../../shared/ui/Switch'

export function PlanDisplay({ labels, onLabels, values, onValues, settings, onSettings }: { labels:boolean;onLabels:(v:boolean)=>void;values:boolean;onValues:(v:boolean)=>void;settings:MapGrid;onSettings:(s:MapGrid)=>void }) {
  return <div className="map-display-settings"><section><h3>Что показывать на карте</h3><div className="map-display-checks"><Switch label="Названия объектов" checked={labels} onChange={onLabels} /><Switch label="Значения у скважин" checked={values} onChange={onValues} /></div></section>
    <section><h3>Координатная сетка</h3><Switch label="Автоматический шаг сетки" checked={settings.step === 0} onChange={value => onSettings({ ...settings, step: value ? 0 : 100 })} /><div className="map-form-grid"><label>Шаг сетки, м<input type="number" min="0" max="10000" step="1" disabled={settings.step === 0} value={settings.step || 100} onChange={e=>onSettings({...settings,step:Number(e.target.value)})} /></label><label>Цвет сетки<input type="color" value={settings.color} onChange={e=>onSettings({...settings,color:e.target.value})} /></label><label>Толщина сетки, px<input type="number" min=".2" max="3" step=".1" value={settings.width} onChange={e=>onSettings({...settings,width:Number(e.target.value)})} /></label>{(['dx','dy'] as const).map(axis=><label key={axis}>Смещение {axis==='dx'?'X':'Y'}, м<input type="number" step="1" min="-10000" max="10000" value={settings[axis]} onChange={e=>onSettings({...settings,[axis]:Number(e.target.value)})} /></label>)}</div>
    {!gridSchema.safeParse(settings).success && <p role="alert" className="map-error">Проверьте параметры: шаг — 0–10 000 м, толщина — 0,2–3 px, смещения — от −10 000 до 10 000 м.</p>}<Button variant="quiet" size="sm" onClick={()=>onSettings(defaultMapGrid)}>Сбросить настройки сетки</Button><p className="map-muted">Локальные метры · X — север, Y — восток. Автоматический шаг подстраивается под увеличение карты. Масштаб печати настраивается отдельно.</p></section>
  </div>
}

export function PlanLegend({ objects, hidden, onHidden }: { objects: MapObject[]; hidden: string[]; onHidden: (hidden: string[]) => void }) {
  return <section className="map-typebar" aria-label="Условные обозначения плана"><WellTypeFilters compact objects={objects} hidden={hidden} onChange={onHidden} /></section>
}

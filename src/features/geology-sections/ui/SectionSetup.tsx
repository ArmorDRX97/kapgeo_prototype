import { Map, Route, Ruler } from 'lucide-react'
import { mapSegments } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { Button } from '../../../shared/ui/Button'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { SectionOverview } from './SectionOverview'
import { ProfileEditor } from './ProfileEditor'
import { SectionWells } from './SectionWells'

export function SectionSetup(props: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void; onMap?:()=>void;onPending?:(pending:boolean)=>void }) {
  return <div className="section-setup"><header className="section-setup__intro"><div><h2>Настройки разреза</h2><p>Параметры документа, сегменты профиля и состав скважин.</p></div>{props.onMap && <Button variant="secondary" onClick={props.onMap}><Map size={16} />Открыть карту разреза</Button>}</header><div className="section-setup__facts"><span><Route size={16} />{mapSegments(props.section).length} сегм.</span><span>{props.section.wellIds.length} скв.</span><span><Ruler size={16} />{profileLength(props.section.profile).toLocaleString('ru', { maximumFractionDigits: 1 })} м</span><span>Z {props.section.bottom}…{props.section.top} м</span></div><div className="section-setup__grid">
    <div className="section-setup__block section-setup__parameters"><SectionOverview {...props} /></div>
    <div className="section-setup__block section-setup__profile"><ProfileEditor {...props} /></div>
    <div className="section-setup__block section-setup__wells"><SectionWells {...props} /></div>
  </div></div>
}

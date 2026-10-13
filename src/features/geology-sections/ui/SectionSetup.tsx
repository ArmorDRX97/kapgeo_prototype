import type { GeologySection } from '../../../entities/geology-section/model/types'
import { SectionOverview } from './SectionOverview'
import { ProfileEditor } from './ProfileEditor'
import { SectionWells } from './SectionWells'

export function SectionSetup(props: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void }) {
  return <div className="section-setup"><div className="section-setup__grid">
    <div className="section-setup__block section-setup__parameters"><SectionOverview {...props} /></div>
    <div className="section-setup__block section-setup__profile"><ProfileEditor {...props} /></div>
    <div className="section-setup__block section-setup__wells"><SectionWells {...props} /></div>
  </div></div>
}

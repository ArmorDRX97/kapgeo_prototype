import { useState } from 'react'
import type { AlphaDocument } from '../../../entities/interpretation/model/alphaTypes'
import { alphaDepositNames, alphaWellKindNames } from '../../../entities/interpretation/model/alphaHeader'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { Button } from '../../../shared/ui/Button'
import { SelectField } from './Fields'

export function HeaderEditor({ doc, disabled, onChange, onPending, onClose }: { doc: AlphaDocument; disabled: boolean; onChange: (doc: AlphaDocument) => void; onPending: (pending: boolean) => void; onClose: () => void }) {
  const [value, setValue] = useState(doc.header), [error, setError] = useState('')
  const close = () => { onPending(false); onClose() }
  const text = (key: 'horizon' | 'block' | 'row' | 'organization' | 'loggedAt', label: string) => <label className="alpha-field"><span>{label}</span><input type={key === 'loggedAt' ? 'date' : 'text'} required maxLength={key === 'organization' ? 120 : 80} value={value[key]} onChange={e => { setValue({ ...value, [key]: e.target.value }); onPending(true) }} /></label>
  return <WorkspaceDialog title="Реквизиты скважины и паспорта" onClose={close}><form onSubmit={e => { e.preventDefault(); try { onChange({ ...doc, header: value }); close() } catch (cause) { setError((cause as Error).message) } }}><fieldset disabled={disabled} className="alpha-parameters">
    <SelectField label="Месторождение в заголовке" value={value.deposit} onChange={deposit => { setValue({ ...value, deposit: deposit as typeof value.deposit }); onPending(true) }} options={Object.entries(alphaDepositNames)} />
    {text('horizon', 'Горизонт')}<div className="alpha-pair">{text('block', 'Блок')}{text('row', 'Ряд')}</div>
    <SelectField label="Назначение скважины" value={value.kind} onChange={kind => { setValue({ ...value, kind: kind as typeof value.kind }); onPending(true) }} options={Object.entries(alphaWellKindNames)} />
    {text('organization', 'Организация')}{text('loggedAt', 'Дата ГИС в заголовке')}
    <p>Реквизиты автономного документа. Коэффициенты методов задаются отдельно; переключение заголовка не загружает данные БГД.</p>
    {!disabled && <Button type="submit">Применить реквизиты</Button>}
  </fieldset>{error && <p role="alert">{error}</p>}<Button variant="secondary" onClick={close}>{disabled ? 'Закрыть' : 'Отменить ввод'}</Button></form></WorkspaceDialog>
}

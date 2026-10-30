import { Plus, Save, SwatchBook, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { z } from 'zod'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { readLegend, type LegendEntry } from './legend'
import './legend-editor.css'

const patterns: { value: LegendEntry['pattern']; label: string }[] = [
  { value: 'dots', label: 'Точки' },
  { value: 'lines', label: 'Линии' },
  { value: 'diagonal', label: 'Штриховка' },
  { value: 'none', label: 'Без крапа' },
]
const legendSchema = z.array(z.object({
  name: z.string().min(1).max(60),
  code: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  pattern: z.enum(['dots', 'lines', 'diagonal', 'none']),
})).min(1).max(80)

export function LegendEditor({ onChange }: { onChange?: () => void }) {
  const [open, setOpen] = useState(false), [rows, setRows] = useState(readLegend), [error, setError] = useState('')
  const update = (index: number, patch: Partial<LegendEntry>) => setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row))
  const add = () => {
    let number = rows.length + 1
    while (rows.some(row => row.code === 'L-' + number)) number++
    setRows([...rows, { name: 'Новая порода', code: 'L-' + number, color: '#dddddd', pattern: 'dots' }])
  }
  const save = () => {
    const result = legendSchema.safeParse(rows)
    if (!result.success || new Set(rows.map(row => row.code)).size !== rows.length) {
      setError('Заполните названия и уникальные коды. Максимум 80 обозначений.')
      return
    }
    try {
      localStorage.setItem('kapgeo.legend.2026.v1', JSON.stringify(rows))
      onChange?.()
      setOpen(false)
    } catch { setError('Не удалось сохранить легенду в браузере') }
  }
  return <>
    <Button size="sm" variant="secondary" onClick={() => { setRows(readLegend()); setError(''); setOpen(true) }}><SwatchBook size={16} />Легенда и коды</Button>
    {open && <WorkspaceDialog title="Легенда и коды" onClose={() => setOpen(false)} footer={<>
      <Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
      <Button onClick={save}><Save size={16} />Сохранить легенду</Button>
    </>}>
      <div className="legend-editor">
        <div className="legend-editor__toolbar"><div><SwatchBook size={18} /><h3>Условные обозначения</h3><Badge tone="neutral">{rows.length} / 80</Badge></div><Button variant="secondary" size="sm" disabled={rows.length >= 80} onClick={add}><Plus size={16} />Добавить обозначение</Button></div>
        {error && <p className="legend-editor__error" role="alert">{error}</p>}
        <div className="legend-editor__table-wrap">
          <table className="legend-editor__table" aria-label="Обозначения пород">
            <colgroup><col className="legend-editor__col-preview" /><col /><col className="legend-editor__col-code" /><col className="legend-editor__col-color" /><col className="legend-editor__col-pattern" /><col className="legend-editor__col-action" /></colgroup>
            <thead><tr><th scope="col"><span className="sr-only">Образец</span></th><th scope="col">Порода</th><th scope="col">Код</th><th scope="col">Цвет</th><th scope="col">Крап</th><th scope="col"><span className="sr-only">Действие</span></th></tr></thead>
            <tbody>{rows.map((row, i) => <tr key={i}>
              <td><span className="legend-editor__preview" role="img" aria-label={'Образец: ' + row.name + ', ' + patterns.find(pattern => pattern.value === row.pattern)?.label} data-pattern={row.pattern} style={{ '--legend-color': row.color } as CSSProperties} /></td>
              <td><input className="legend-editor__input" aria-label={'Порода ' + (i + 1)} value={row.name} maxLength={60} onChange={event => update(i, { name: event.target.value })} /></td>
              <td><input className="legend-editor__input legend-editor__code" aria-label={'Код ' + (i + 1)} value={row.code} maxLength={30} onChange={event => update(i, { code: event.target.value })} /></td>
              <td><label className="legend-editor__color" title="Выбрать цвет"><input aria-label={'Цвет ' + (i + 1)} type="color" value={row.color} onChange={event => update(i, { color: event.target.value })} /><span style={{ backgroundColor: row.color }} /><code aria-hidden="true">{row.color.toUpperCase()}</code></label></td>
              <td><select className="legend-editor__input" aria-label={'Крап ' + (i + 1)} value={row.pattern} onChange={event => update(i, { pattern: event.target.value as LegendEntry['pattern'] })}>{patterns.map(pattern => <option key={pattern.value} value={pattern.value}>{pattern.label}</option>)}</select></td>
              <td><Button className="legend-editor__delete" variant="quiet" size="sm" disabled={rows.length === 1} aria-label={'Удалить обозначение ' + (row.name || i + 1)} title={rows.length === 1 ? 'В легенде должно остаться хотя бы одно обозначение' : 'Удалить обозначение'} onClick={() => setRows(rows.filter((_, index) => index !== i))}><Trash2 size={16} /></Button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="legend-editor__hint">Образец слева показывает выбранные цвет и крап. Изменения применятся после сохранения легенды.</p>
      </div>
    </WorkspaceDialog>}
  </>
}

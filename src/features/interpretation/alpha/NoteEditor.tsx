import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { AlphaViewPreferences } from './viewPreferences'
import { Button } from '../../../shared/ui/Button'
import { NumberField, SelectField } from './Fields'

export function NoteEditor({ trackId, depthLimit, notes, onChange }: { trackId: string; depthLimit: number; notes: AlphaViewPreferences['notes']; onChange: (notes: AlphaViewPreferences['notes']) => void }) {
  const [id, setId] = useState(''), [depth, setDepth] = useState(120), [text, setText] = useState(''), [error, setError] = useState('')
  const choose = (id: string) => { const note = notes.find(n => n.id === id); setId(id); setDepth(note?.depth ?? 120); setText(note?.text ?? ''); setError('') }
  const apply = () => {
    if (!Number.isFinite(depth) || depth < 0 || depth > depthLimit || !text.trim()) { setError('Введите текст и глубину внутри скважины.'); return }
    if (!id && notes.length >= 100) { setError('В представлении уже 100 надписей.'); return }
    let index = notes.length + 1; while (notes.some(n => n.id === `note-${index}`)) index++
    const nextId = id || `note-${index}`
    onChange([...notes.filter(n => n.id !== nextId), { id: nextId, trackId, depth, text: text.trim() }]); setId(nextId); setError('')
  }
  return <details className="alpha-group"><summary>Подписи на колонке</summary><div><SelectField label="Подпись планшета" value={id} onChange={choose} options={[["", "Новая подпись"], ...notes.filter(n => n.trackId === trackId).map(n => [n.id, `${n.depth} м · ${n.text}`] as const)]} /><NumberField label="Глубина подписи, м" value={depth} onChange={setDepth} /><label className="alpha-field"><span>Текст подписи</span><input maxLength={120} value={text} onChange={e => setText(e.target.value)} /></label><div className="alpha-actions"><Button size="sm" variant="secondary" onClick={apply}>Применить подпись</Button>{id && <Button className="action-delete" size="sm" variant="quiet" onClick={() => { onChange(notes.filter(n => n.id !== id)); choose('') }}><Trash2 size={15} />Удалить подпись</Button>}</div>{error && <p role="alert">{error}</p>}</div></details>
}

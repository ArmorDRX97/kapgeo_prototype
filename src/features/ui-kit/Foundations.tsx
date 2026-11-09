import { useEffect, useState } from 'react'
import { Copy, Type } from 'lucide-react'
import { Badge } from '../../shared/ui/Badge'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import { Caption, Example, type Notify } from './kitParts'

const colorGroups = [
  { name: 'Бренд', tokens: ['--color-brand-50', '--color-brand-100', '--color-brand-200', '--color-brand-300', '--color-brand-400', '--color-brand-500', '--color-brand-600', '--color-brand-700', '--color-brand-800', '--color-accent-500'] },
  { name: 'Текст и поверхности', tokens: ['--text-primary', '--text-secondary', '--text-tertiary', '--text-inverse', '--surface-app', '--surface-panel', '--surface-subtle', '--surface-dark', '--border-default', '--border-strong', '--focus-ring'] },
  { name: 'Семантика', tokens: ['--color-green-50', '--color-green-700', '--color-amber-50', '--color-amber-700', '--color-red-50', '--color-red-600', '--color-blue-50', '--color-blue-600', '--color-violet-50', '--color-violet-600'] },
]
const tokenValue = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
export function Colors({ notify }: { notify: Notify }) {
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); notify(`Скопировано: ${value}`) } catch { notify('Буфер обмена недоступен. Значение можно выделить и скопировать вручную.') } }
  return <div className="uik-stack">{colorGroups.map(group => <Example key={group.name} title={group.name} description="Цвета считываются из действующей темы приложения."><div className="uik-swatches">{group.tokens.map(token => <button key={token} className="uik-swatch" type="button" onClick={() => void copy(tokenValue(token))} aria-label={`Скопировать ${token}`}><i style={{ background: `var(${token})` }} /><span><strong>{tokenValue(token) || '—'}</strong><small>{token.replace('--', '')}</small></span><Copy size={14}/></button>)}</div></Example>)}
    <Example title="Предметные цвета" description="Цвета кривых и пород из общей геологической палитры."><div className="uik-row">{Object.entries(domainTokens.curves).map(([name, color]) => <button className="uik-color-tag" key={name} onClick={() => void copy(color)}><i style={{ background: color }}/><strong>{name}</strong>{color}</button>)}</div></Example>
    <div className="uik-grid"><Example title="Отступы"><div className="uik-spacing">{[4,8,12,16,20,24,32,40].map(n => <div key={n}><span>{n} px</span><i style={{ width: n }}/></div>)}</div></Example><Example title="Радиусы и тени"><div className="uik-row">{['sm','md','lg','xl'].map(n => <div key={n} className="uik-radius" style={{ borderRadius: `var(--radius-${n})`, boxShadow: 'var(--shadow-sm)' }}>{tokenValue(`--radius-${n}`)}</div>)}</div><Caption>Панель: shadow-sm · всплывающее меню: shadow-md · модальное окно: shadow-lg.</Caption></Example></div>
  </div>
}

const fontSpecs = [
  { label: 'Segoe UI', family: 'KAPGEO Kit Segoe', role: 'Основная гарнитура', detail: 'Фирменная гарнитура КАП · семейство Segoe UI' },
  { label: 'Roboto', family: 'KAPGEO Kit Roboto', role: 'Первый резервный шрифт', detail: 'Локальная гарнитура · 100–900' },
  { label: 'Arial', family: 'KAPGEO Kit Arial', role: 'Второй резервный шрифт', detail: 'Системный шрифт · 400' },
  { label: 'Times New Roman', family: 'KAPGEO Kit Times', role: 'Паспортный лист', detail: 'Гарнитура для печатных документов · 400' },
]
function FontSpecimen({ spec, sample }: { spec: typeof fontSpecs[number]; sample: string }) {
  const [status,setStatus] = useState<'loading'|'loaded'|'unavailable'>('loading')
  useEffect(() => {
    let current = true
    const fonts = document.fonts
    if (!fonts) return
    void fonts.load(`16px "${spec.family}"`).then(faces => { if(current) setStatus(faces.length ? 'loaded' : 'unavailable') }, () => { if(current) setStatus('unavailable') })
    return () => { current = false }
  }, [spec.family])
  return <article className="uik-font-card"><header><div><small>{spec.role}</small><h3>{spec.label}</h3></div><Badge tone={status === 'loaded' ? 'success' : 'warning'}>{status === 'loaded' ? 'Гарнитура загружена' : status === 'loading' ? 'Загрузка…' : 'Нет на этом устройстве'}</Badge></header>
    {status === 'loaded' ? <p className="uik-font-sample" style={{ fontFamily: `"${spec.family}"`, fontWeight: 400 }}>{sample || 'Геологические данные · Ә Ғ Қ Ң Ө Ұ Ү Һ І'}</p> : <p className="uik-caption">{status === 'loading' ? 'Подготавливаем образец…' : 'Образец не подменяется другим шрифтом. Для просмотра нужна указанная гарнитура.'}</p>}<small>{spec.detail}</small></article>
}
export function Typography() {
  const [sample,setSample] = useState('Геологические данные · Ә Ғ Қ Ң Ө Ұ Ү Һ І')
  return <div className="uik-stack"><Example title="Гарнитуры и порядок подстановки" description="Segoe UI → Roboto → Arial → sans-serif. Основная и первая резервная гарнитуры соответствуют фирменным шрифтам КАП."><label className="field"><span className="field__label">Текст для сравнения</span><input value={sample} onChange={e=>setSample(e.target.value)}/></label><div className="uik-fonts">{fontSpecs.map(spec=><FontSpecimen key={spec.label} spec={spec} sample={sample}/>)}</div><Caption>Каждая карточка использует указанную гарнитуру. Roboto включён в приложение; утверждённые печатные формы сохраняют свою типографику.</Caption></Example>
    <Example title="Иерархия текста" description="Размеры в CSS px; начертание и интервал показаны у каждой строки."><div className="uik-type-scale">{[{label:'Большой заголовок',size:32,weight:700,line:1.15},{label:'Заголовок страницы',size:26,weight:700,line:1.2},{label:'Заголовок раздела',size:20,weight:650,line:1.3},{label:'Заголовок панели',size:14,weight:700,line:1.3},{label:'Основной текст',size:14,weight:400,line:1.5},{label:'Подпись поля',size:12,weight:600,line:1.4},{label:'Метаданные',size:11,weight:400,line:1.4}].map(t=><div key={t.label}><span style={{ fontSize:t.size,fontWeight:t.weight,lineHeight:t.line }}>{t.label}</span><code>{t.size} px / {t.weight} / {t.line}</code></div>)}</div></Example>
    <Example title="Цвета текста и начертания"><div className="uik-grid">{['primary','secondary','tertiary'].map(t=><div key={t}><Type size={20}/><p style={{ color:`var(--text-${t})` }}>Текст · {t}</p><code>{tokenValue(`--text-${t}`)}</code></div>)}</div><div className="uik-row uik-weight-row">{[400,600,700].map(w=><span key={w} style={{ fontFamily:'KAPGEO Kit Segoe',fontWeight:w }}>Данные Aa · {w}</span>)}</div></Example>
  </div>
}

import { Check, ChevronDown, Languages } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import './language-switcher.css'

const languages = [
  { code: 'ru', label: 'Русский', nativeName: 'Русский' },
  { code: 'kk', label: 'Казахский', nativeName: 'Қазақша' },
  { code: 'en', label: 'Английский', nativeName: 'English' },
] as const

function LanguageFlag({ code }: { code: typeof languages[number]['code'] }) {
  return <svg className="language-switcher__flag" viewBox="0 0 30 20" aria-hidden="true">
    {code === 'ru' && <><path fill="#fff" d="M0 0h30v20H0z" /><path fill="#224abe" d="M0 6.67h30v6.66H0z" /><path fill="#d83945" d="M0 13.33h30V20H0z" /></>}
    {code === 'kk' && <><path fill="#00abc2" d="M0 0h30v20H0z" /><path stroke="#ffda44" strokeWidth="1.1" d="M3 2v16M1.5 4l3 2-3 2 3 2-3 2 3 2-3 2" /><circle cx="17" cy="8" r="3" fill="#ffda44" /><circle cx="17" cy="8" r="4.4" fill="none" stroke="#ffda44" strokeWidth="1.4" strokeDasharray="1 1.3" /><path fill="#ffda44" d="m10 13 7 2 7-2-3 3-4 1-4-1z" /></>}
    {code === 'en' && <><path fill="#193571" d="M0 0h30v20H0z" /><path stroke="#fff" strokeWidth="5" d="m0 0 30 20M30 0 0 20" /><path stroke="#c73443" strokeWidth="2" d="m0 0 30 20M30 0 0 20" /><path stroke="#fff" strokeWidth="7" d="M15 0v20M0 10h30" /><path stroke="#c73443" strokeWidth="4" d="M15 0v20M0 10h30" /></>}
  </svg>
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const initialFocus = useRef(0)

  const closeAndFocus = () => { setOpen(false); triggerRef.current?.focus() }

  useEffect(() => {
    if (!open) return
    itemRefs.current[initialFocus.current]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeAndFocus(); return }
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown' ? (current + 1) % languages.length
      : event.key === 'ArrowUp' ? (current + languages.length - 1) % languages.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? languages.length - 1 : undefined
    if (next !== undefined) { event.preventDefault(); itemRefs.current[next]?.focus() }
  }

  return <div className="language-switcher" ref={rootRef} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} className="language-switcher__trigger" type="button" aria-label="Язык интерфейса: Русский" title="Язык интерфейса: Русский"
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { initialFocus.current = 0; setOpen((value) => !value) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); initialFocus.current = event.key === 'ArrowUp' ? languages.length - 1 : 0; setOpen(true)
        }
      }}>
      <Languages size={19} aria-hidden="true" /><span>Русский</span><ChevronDown className="language-switcher__chevron" size={14} aria-hidden="true" />
    </button>
    {open && <div id={id} className="language-switcher__menu" role="menu" aria-label="Язык интерфейса" onKeyDown={onMenuKeyDown}>
      <p className="language-switcher__heading">Язык интерфейса</p>
      {languages.map((language, index) => <button key={language.code} ref={(element) => { itemRefs.current[index] = element }}
        type="button" role="menuitemradio" aria-label={language.label} aria-checked={language.code === 'ru'} tabIndex={-1} onClick={closeAndFocus}>
        <LanguageFlag code={language.code} /><span className="language-switcher__label"><strong>{language.label}</strong>{language.code !== 'ru' && <small lang={language.code}>{language.nativeName}</small>}</span>
        {language.code === 'ru' && <Check size={17} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}

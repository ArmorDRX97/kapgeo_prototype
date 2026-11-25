import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import type { UserPersona } from '../../entities/session/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { Button } from '../../shared/ui/Button'
import { BrandMark } from '../../shared/ui/BrandMark'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'

const BOUND_KEY = 'kapgeo.auth.demo-app-bound'
const RESEND_SECONDS = 60
const VERIFY_DELAY_MS = 1200
const emptyCode = () => Array<string>(6).fill('')
type Step = 'credentials' | 'qr' | 'code' | 'verifying'

// A decorative code for the clickable prototype; it does not link a real device.
const qrModules = Array.from({ length: 29 * 29 }, (_, index) => {
  const x = index % 29
  const y = Math.floor(index / 29)
  const finder = ([[0, 0], [22, 0], [0, 22]] as const).find(([left, top]) => x >= left && x < left + 7 && y >= top && y < top + 7)
  if (finder) {
    const dx = x - finder[0]
    const dy = y - finder[1]
    return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
  }
  if ((x < 8 && y < 8) || (x >= 21 && y < 8) || (x < 8 && y >= 21)) return false
  return ((x * 17 + y * 31 + x * y * 7 + (x ^ y) * 13) % 11) < 5
})

export function SignInPage() {
  const navigate = useNavigate()
  const { signIn } = useSession()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [bound, setBound] = useState(() => localStorage.getItem(BOUND_KEY) === 'true')
  const [step, setStep] = useState<Step>('credentials')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [code, setCode] = useState(emptyCode)
  const [deadline, setDeadline] = useState(0)
  const [now, setNow] = useState(Date.now)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.code === 'F8' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.repeat) {
        event.preventDefault()
        setSettingsOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  useEffect(() => () => {
    if (scanTimer.current) clearTimeout(scanTimer.current)
    if (verifyTimer.current) clearTimeout(verifyTimer.current)
  }, [])
  useEffect(() => {
    if (step !== 'code') return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [step])
  useEffect(() => { if (step === 'code' && !settingsOpen) inputs.current[0]?.focus() }, [step, settingsOpen])

  const setDemoBound = (value: boolean) => {
    setBound(value)
    if (value) localStorage.setItem(BOUND_KEY, 'true')
    else localStorage.removeItem(BOUND_KEY)
  }
  const resetStep = () => {
    if (scanTimer.current) clearTimeout(scanTimer.current)
    if (verifyTimer.current) clearTimeout(verifyTimer.current)
    verifyTimer.current = null
    setScanning(false)
    setCode(emptyCode())
    setStep('credentials')
  }
  const startCode = () => {
    setCode(emptyCode())
    const time = Date.now()
    setNow(time)
    setDeadline(time + RESEND_SECONDS * 1000)
    setStep('code')
  }
  const handleCredentials = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (bound) startCode()
    else setStep('qr')
  }
  const handleScan = () => {
    if (scanning) return
    setScanning(true)
    scanTimer.current = setTimeout(() => {
      setDemoBound(true)
      setScanning(false)
      startCode()
    }, 1100)
  }
  const updateCode = (index: number, value: string) => {
    if (verifyTimer.current) return
    const digits = value.replace(/\D/g, '').slice(0, 6 - index)
    const next = [...code]
    if (!digits) next[index] = ''
    else digits.split('').forEach((digit, offset) => { next[index + offset] = digit })
    setCode(next)
    if (next.every(Boolean)) {
      setStep('verifying')
      verifyTimer.current = setTimeout(() => {
        verifyTimer.current = null
        let persona: UserPersona | undefined
        flushSync(() => { persona = signIn({ login, password }) })
        if (persona) void navigate({ to: persona.homeRoute })
      }, VERIFY_DELAY_MS)
    } else if (digits) {
      inputs.current[Math.min(index + digits.length, 5)]?.focus()
    }
  }
  const handleCodeKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      event.preventDefault()
      const next = [...code]
      next[index - 1] = ''
      setCode(next)
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    else if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus()
  }
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault()
    updateCode(index, event.clipboardData.getData('text'))
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-label="О системе">
        <div className="brand brand--large">
          <BrandMark />
          <span className="brand__text"><strong>AI KAPGEO</strong><small>Industrial intelligence platform</small></span>
        </div>
        <div className="auth-visual__content">
          <p className="auth-visual__eyebrow">Данные недр. Точные решения.</p>
          <h1><strong>AI KAPGEO</strong> — Информационная система геологических и технологических данных</h1>
          <p>Единое пространство для месторождений, участков, залежей, скважин и истории изменений.</p>
          <ul className="auth-benefits">
            <li><CheckCircle2 size={17} /> Единый реестр</li>
            <li><CheckCircle2 size={17} /> История изменений</li>
          </ul>
        </div>
        <p className="auth-visual__caption">Месторождения · Скважины · Геологические данные</p>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <p className="eyebrow">AI KAPGEO</p>
          {step === 'credentials' && <form onSubmit={handleCredentials} noValidate>
            <h2>Вход в систему</h2>
            <p className="auth-form-card__lead">Введите логин и пароль, чтобы продолжить вход.</p>
            <div className="auth-form-fields">
              <label className="field"><span className="field__label">Логин</span><input autoComplete="username" autoFocus name="login" placeholder="name.surname@company.kz" value={login} onChange={(event) => setLogin(event.target.value)} /></label>
              <label className="field"><span className="field__label">Пароль</span><input autoComplete="current-password" name="password" type="password" placeholder="Введите пароль" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            </div>
            <Button className="button--full auth-submit" type="submit">Продолжить <ArrowRight size={18} /></Button>
          </form>}
          {step === 'qr' && <div className="auth-step">
            <div className="auth-step__heading">
              <div className="auth-step__icon"><Smartphone size={20} /></div>
              <h2>Подключите приложение</h2>
            </div>
            <p className="auth-form-card__lead">При первом входе отсканируйте QR-код в приложении AI KAPGEO, чтобы привязать устройство.</p>
            <button type="button" className={`auth-qr${scanning ? ' auth-qr--scanning' : ''}`} onClick={handleScan} disabled={scanning} aria-label="Имитировать сканирование QR-кода">
              <svg viewBox="-2 -2 33 33" role="img" aria-label="Демонстрационный QR-код" shapeRendering="crispEdges">
                <rect x="-2" y="-2" width="33" height="33" fill="white" />
                {qrModules.map((filled, index) => filled && <rect key={index} x={index % 29} y={Math.floor(index / 29)} width="1" height="1" fill="#102d3a" />)}
              </svg>
              {scanning && <span className="auth-qr__scan" />}
            </button>
            <p className="auth-step__hint" role="status">{scanning ? 'Подключаем приложение…' : 'После сканирования код для входа появится в приложении.'}</p>
            <p className="auth-demo-hint">Для демонстрации нажмите на QR-код</p>
            <button type="button" className="auth-back" onClick={resetStep}><ArrowLeft size={16} /> Вернуться назад</button>
          </div>}
          {step === 'code' && <div className="auth-step">
            <div className="auth-step__heading">
              <div className="auth-step__icon"><Smartphone size={20} /></div>
              <h2>Подтвердите вход</h2>
            </div>
            <p className="auth-form-card__lead">Введите 6-значный код из приложения AI KAPGEO. Вход произойдёт автоматически.</p>
            <div className="auth-code" role="group" aria-label="Код подтверждения">
              {code.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element }} aria-label={`Цифра ${index + 1} из 6`} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} value={digit} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateCode(index, event.target.value)} onKeyDown={(event) => handleCodeKey(event, index)} onPaste={(event) => handlePaste(event, index)} />)}
            </div>
            <div className="auth-resend" aria-live="polite">
              <span>Не пришёл код?</span>{' '}
              {remaining > 0 ? <span>Отправить снова через {remaining} сек.</span> : <button type="button" onClick={startCode}>Отправить код в приложение снова</button>}
            </div>
            <p className="auth-demo-hint auth-demo-hint--left">В прототипе подойдёт любой 6-значный код</p>
            <button type="button" className="auth-back" onClick={resetStep}><ArrowLeft size={16} /> Вернуться к входу</button>
          </div>}
          {step === 'verifying' && <div className="auth-verifying" role="status" aria-label="Проверка кода">
            <span className="auth-verifying__spinner" aria-hidden="true" />
          </div>}
        </div>
      </section>
      {settingsOpen && <WorkspaceDialog title="Настройки прототипа" size="compact" onClose={() => setSettingsOpen(false)} footer={<Button onClick={() => setSettingsOpen(false)}>Готово <Check size={16} /></Button>}>
        <p className="auth-settings__intro">Выберите сценарий следующего входа. Настройка хранится в этом браузере и нужна только для демонстрации.</p>
        <div className="auth-settings__options">
          <label className={`auth-settings__option${!bound ? ' is-selected' : ''}`}><input type="radio" name="auth-demo-mode" checked={!bound} onChange={() => { setDemoBound(false); resetStep() }} /><span><strong>Первый вход</strong><small>После логина и пароля — привязка приложения по QR-коду, затем код.</small></span></label>
          <label className={`auth-settings__option${bound ? ' is-selected' : ''}`}><input type="radio" name="auth-demo-mode" checked={bound} onChange={() => { setDemoBound(true); resetStep() }} /><span><strong>Приложение уже подключено</strong><small>После логина и пароля сразу появится ввод кода.</small></span></label>
        </div>
        <button type="button" className="auth-settings__reset" onClick={() => { setDemoBound(false); resetStep() }}>Сбросить состояние входа</button>
        <p className="auth-settings__note">Сброс возвращает сценарий первого входа. Остальные данные прототипа не затрагиваются.</p>
      </WorkspaceDialog>}
    </main>
  )
}


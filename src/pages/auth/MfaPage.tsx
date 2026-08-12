import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '../../entities/session/model/sessionContext'
import { Button } from '../../shared/ui/Button'

export function MfaPage() {
  const navigate = useNavigate()
  const { pendingPersona, verifyMfa } = useSession()
  const [code, setCode] = useState('246810')
  const [error, setError] = useState('')

  const submit = () => {
    if (!verifyMfa(code)) {
      setError('Неверный одноразовый код. Проверьте введённое значение.')
      return
    }
    void navigate({ to: pendingPersona?.homeRoute === '/geology' ? '/home' : (pendingPersona?.homeRoute ?? '/home') })
  }

  return (
    <main className="auth-layout auth-layout--centered">
      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <button className="back-button" type="button" onClick={() => void navigate({ to: '/auth/sign-in' })}><ArrowLeft size={16} /> Назад</button>
          <div className="auth-form-card__icon"><KeyRound size={24} /></div>
          <p className="eyebrow">Второй фактор</p>
          <h1>Подтвердите вход</h1>
          <p className="auth-form-card__lead">Код для <strong>{pendingPersona?.name ?? 'пользователя'}</strong> отправлен в приложение-аутентификатор.</p>

          <label className="field">
            <span className="field__label">Шестизначный код</span>
            <input
              className="mfa-input"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, '')); setError('') }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'mfa-error' : 'mfa-hint'}
            />
            {error ? <span id="mfa-error" className="field__error">{error}</span> : <span id="mfa-hint" className="field__hint">Введите код из приложения-аутентификатора.</span>}
          </label>

          <Button className="button--full" onClick={submit} disabled={code.length !== 6}>
            <ShieldCheck size={18} /> Подтвердить и продолжить
          </Button>
          <button className="auth-secondary-action" type="button">Отправить код повторно · 00:42</button>
        </div>
      </section>
    </main>
  )
}

import { useNavigate } from '@tanstack/react-router'
import { Building2, CheckCircle2, Globe2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { userPersonas, defaultPersona } from '../../entities/session/model/personas'
import { useSession } from '../../entities/session/model/sessionContext'
import { Button } from '../../shared/ui/Button'

export function SignInPage() {
  const navigate = useNavigate()
  const { beginSso } = useSession()
  const [personaId, setPersonaId] = useState(defaultPersona.id)

  const handleSignIn = () => {
    beginSso(personaId)
    void navigate({ to: '/auth/mfa' })
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-label="О системе">
        <div className="brand brand--large">
          <span className="brand__mark"><span /></span>
          <span className="brand__text"><strong>AI KAPGEO</strong><small>Industrial intelligence platform</small></span>
        </div>
        <div className="auth-visual__content">
          <h1>Единая среда для работы с недрами и производством</h1>
          <p>Геология, технология, моделирование и аналитика — в связанном пространстве данных, версий и решений.</p>
          <ul className="auth-benefits">
            <li><CheckCircle2 size={18} /> Сквозная карточка скважины</li>
            <li><CheckCircle2 size={18} /> Объяснимый AI под контролем эксперта</li>
            <li><CheckCircle2 size={18} /> Версии, согласование и аудит</li>
          </ul>
        </div>
        <div className="auth-visual__mesh" aria-hidden="true" />
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <div className="auth-form-card__icon"><ShieldCheck size={24} /></div>
          <p className="eyebrow">Корпоративный доступ</p>
          <h2>Вход в AI KAPGEO</h2>
          <p className="auth-form-card__lead">Используйте корпоративную учётную запись. После входа потребуется второй фактор.</p>

          <label className="field">
            <span className="field__label">Профиль пользователя</span>
            <select value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
              {userPersonas.map((persona) => (
                <option key={persona.id} value={persona.id}>{persona.position} · {persona.name}</option>
              ))}
            </select>
            <span className="field__hint">Персона определяет роли, область данных и стартовую страницу.</span>
          </label>

          <Button className="button--full" onClick={handleSignIn}>
            <Building2 size={18} /> Войти через корпоративный SSO
          </Button>

          <button className="auth-secondary-action" type="button">
            <LockKeyhole size={16} /> Войти с локальной учётной записью
          </button>

          <div className="auth-form-card__divider" />
          <div className="auth-meta-row">
            <span><Globe2 size={15} /> Русский</span>
            <button type="button">Запросить доступ</button>
          </div>
        </div>
      </section>
    </main>
  )
}

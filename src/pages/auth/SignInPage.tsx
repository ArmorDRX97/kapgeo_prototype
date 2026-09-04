import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchPlatformPreferences } from '../../repository/api'
import { Button } from '../../shared/ui/Button'

export function SignInPage() {
  const navigate = useNavigate()
  const { signIn } = useSession()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const { data: preferences } = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const minimumMode = preferences?.minimumMode ?? false

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const persona = signIn({ login, password, ...(minimumMode ? { personaId: 'geo.ivanova' } : {}) })
    void navigate({ to: minimumMode ? '/geology/bgd' : persona.homeRoute === '/geology' ? '/home' : persona.homeRoute })
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-label="О системе">
        <div className="brand brand--large">
          <span className="brand__mark"><span /></span>
          <span className="brand__text"><strong>AI KAPGEO</strong><small>Industrial intelligence platform</small></span>
        </div>
        <div className="auth-visual__content">
          <p className="auth-visual__eyebrow">Данные недр. Точные решения.</p>
          <h1>{minimumMode ? 'База геологических данных' : 'Цифровая среда для управления недрами'}</h1>
          <p>{minimumMode ? 'Единое пространство для месторождений, участков, залежей и истории изменений.' : 'Связываем геологию, технологию, моделирование и аналитику в одной прослеживаемой системе.'}</p>
          <ul className="auth-benefits">
            {minimumMode ? <>
              <li><CheckCircle2 size={17} /> Единый реестр</li>
              <li><CheckCircle2 size={17} /> История изменений</li>
            </> : <>
              <li><CheckCircle2 size={17} /> Единые данные</li>
              <li><CheckCircle2 size={17} /> Контроль версий</li>
              <li><CheckCircle2 size={17} /> Прослеживаемые решения</li>
            </>}
          </ul>
        </div>
        <p className="auth-visual__caption">Геология · Технология · Моделирование · Аналитика</p>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form-card" onSubmit={handleSignIn} noValidate>
          <p className="eyebrow">AI KAPGEO</p>
          <h2>Вход в систему</h2>
          <p className="auth-form-card__lead">Введите данные или сразу продолжите в демонстрационный режим.</p>

          <div className="auth-form-fields">
            <label className="field">
              <span className="field__label">Логин</span>
              <input
                autoComplete="username"
                autoFocus
                name="login"
                placeholder="name.surname@company.kz"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Пароль</span>
              <input
                autoComplete="current-password"
                name="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          <Button className="button--full auth-submit" type="submit">
            Войти <ArrowRight size={18} />
          </Button>
        </form>
      </section>
    </main>
  )
}

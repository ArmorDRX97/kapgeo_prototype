import { BookOpenCheck, KeyRound, MapPinned, Search, UserRoundCheck } from 'lucide-react'
import { HelpBreadcrumbs, HelpFrame, GuideLink } from '../ui/HelpFrame'

export function HelpStartPage() {
  return <HelpFrame eyebrow="Быстрый старт" title="С чего начать работу" description="Последовательность от входа до первого предметного действия. Маршрут занимает несколько минут и подходит любой роли.">
    <HelpBreadcrumbs items={[{ label: 'Справка', href: '/help' }, { label: 'С чего начать' }]} />
    <section className="onboarding-steps">
      <article><span>1</span><UserRoundCheck size={22} /><div><h2>Выберите профиль</h2><p>На экране входа выберите должность. Профиль определяет стартовую страницу, модули и scope данных.</p><GuideLink href="/auth/sign-in">Открыть страницу входа</GuideLink></div></article>
      <article><span>2</span><KeyRound size={22} /><div><h2>Подтвердите второй фактор</h2><p>Нажмите «Войти через корпоративный SSO», затем подтвердите шестизначный код. После проверки откроется ролевой рабочий стол.</p><GuideLink href="/auth/mfa">Открыть MFA</GuideLink></div></article>
      <article><span>3</span><BookOpenCheck size={22} /><div><h2>Откройте «Мои задачи»</h2><p>Работу следует начинать с очереди: задача уже содержит объект, срок, модуль и ожидаемое действие.</p><GuideLink href="/work">Открыть задачи</GuideLink></div></article>
      <article><span>4</span><Search size={22} /><div><h2>Найдите объект</h2><p>Используйте глобальный поиск в шапке для WELL-1042, BLK-07-12, отчёта OP-DAY-03 или результата RESULT-07.</p><GuideLink href="/objects/wells/WELL-1042">Открыть WELL-1042</GuideLink></div></article>
      <article><span>5</span><MapPinned size={22} /><div><h2>Выполните ролевой сценарий</h2><p>Следуйте руководству своей роли. Каждый шаг содержит прямую ссылку и ожидаемый результат.</p><GuideLink href="/help/roles">Выбрать роль</GuideLink></div></article>
    </section>

    <section className="help-two-columns">
      <article className="help-note"><h2>Что находится в шапке</h2><ul><li><strong>Контекст</strong> — организация, месторождение и участок.</li><li><strong>На дату</strong> — временной срез данных.</li><li><strong>Глобальный поиск</strong> — объект, блок, отчёт или модель.</li><li><strong>Фоновые задачи</strong> — импорт и расчёты.</li><li><strong>Профиль</strong> — активная роль и выход.</li></ul></article>
      <article className="help-note"><h2>Правила безопасной работы</h2><ul><li>Проверяйте scope и дату до изменения данных.</li><li>Не редактируйте опубликованную версию — создавайте новую.</li><li>Сохраняйте причину существенного изменения.</li><li>AI-результат требует решения человека.</li><li>Перед публикацией проверяйте источники и зависимости.</li></ul></article>
    </section>
  </HelpFrame>
}

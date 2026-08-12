import type { FlowGuide, VerificationRecord } from '../model/types'

export const flowGuides: FlowGuide[] = [
  {
    id: 'interpretation', title: 'От скважины к экспертной интерпретации', summary: 'Первичные данные → ГИС → решение эксперта → разрез и запасы.', actors: ['R1 Геолог', 'R2 Геофизик', 'R3 Инженер по запасам'],
    steps: [
      { title: 'Подготовить первичные данные', description: 'Геолог проверяет паспорт, литологию и пробы.', href: '/objects/wells/WELL-1042?tab=lithology', linkLabel: 'Открыть литологию', result: 'Согласованные интервалы.' },
      { title: 'Проверить ГИС', description: 'Геофизик изучает кривые и QC.', href: '/objects/wells/WELL-1042?tab=logs', linkLabel: 'Открыть ГИС', taskId: 'TASK-121', result: 'Проверенный набор.' },
      { title: 'Разрешить AI-конфликт', description: 'Эксперт выбирает границу и фиксирует причину.', href: '/geology/interpretations/INT-WELL-1042-07/compare', linkLabel: 'Открыть сравнение', taskId: 'TASK-118', result: 'Экспертная версия.' },
      { title: 'Передать в запасы', description: 'Инженер подтверждает корреляцию и расчёт.', href: '/geology/reserves', linkLabel: 'Открыть запасы', result: 'Опубликованный GEO snapshot.' },
    ],
  },
  {
    id: 'shift', title: 'От сменного замера к технологическому решению', summary: 'Замеры и лаборатория → баланс → решение → РВР → отчёт.', actors: ['R7 Диспетчер', 'R8 Лаборант', 'R6 Технолог', 'R9 Механик', 'R10 Мастер РВР', 'R12 Главный технолог'],
    steps: [
      { title: 'Собрать факт', description: 'Диспетчер заполняет обязательные замеры.', href: '/technology/measurements', linkLabel: 'Открыть замеры', result: 'Закрытый пакет смены.' },
      { title: 'Опубликовать лабораторию', description: 'Лаборант вводит результат и QA/QC.', href: '/technology/solutions', linkLabel: 'Открыть лабораторию', result: 'Результат связан со сменой.' },
      { title: 'Разобрать DEV-042', description: 'Технолог выбирает повторный замер или РВР.', href: '/technology/balance', linkLabel: 'Открыть баланс', result: 'Создано действие.' },
      { title: 'Исполнить РВР', description: 'Механик подтверждает оборудование, мастер фиксирует работу.', href: '/technology/rvr/DEV-042', linkLabel: 'Открыть РВР', result: 'Факт и эффект сохранены.' },
      { title: 'Опубликовать отчёт', description: 'Технолог и руководитель сверяют план-факт.', href: '/technology/plan-fact', linkLabel: 'Открыть отчёт', result: 'Опубликованный OP-DAY-03.' },
    ],
  },
  {
    id: 'model', title: 'От опубликованных данных к прогнозу', summary: 'GEO/TECH snapshot → модель → сценарии → аналитика → решение.', actors: ['R3 Инженер по запасам', 'R4 Моделист', 'R5 Гидрогеохимик', 'R11 Аналитик', 'R12 Главный технолог'],
    steps: [
      { title: 'Закрепить входы', description: 'Моделист создаёт snapshot опубликованных версий.', href: '/modeling', linkLabel: 'Открыть проекты', result: 'Входы воспроизводимы.' },
      { title: 'Проверить и запустить', description: 'Preflight подтверждает сетку и параметры.', href: '/modeling/run/MOD-PR-07', linkLabel: 'Открыть запуск', result: 'Получен RESULT-07.' },
      { title: 'Сравнить сценарии', description: 'Эксперты оценивают BASE-01 и ALT-02.', href: '/modeling/compare', linkLabel: 'Открыть сравнение', result: 'Выбран сценарий.' },
      { title: 'Принять решение', description: 'Аналитик собирает evidence, руководитель фиксирует решение.', href: '/analytics/decision', linkLabel: 'Открыть решение', result: 'Решение имеет источники и автора.' },
    ],
  },
  {
    id: 'access', title: 'Запрос и выдача доступа', summary: 'Заявка → проверка effective permissions → согласование → аудит.', actors: ['Пользователь', 'R12 Руководитель', 'R13 Администратор'],
    steps: [
      { title: 'Создать заявку', description: 'Запрос содержит роль, scope и обоснование.', href: '/auth/sign-in', linkLabel: 'Открыть вход', result: 'Создана ACC-019.' },
      { title: 'Проверить права', description: 'Администратор сверяет effective permissions.', href: '/admin', linkLabel: 'Открыть пользователей', taskId: 'ACC-019', result: 'Конфликты исключены.' },
      { title: 'Одобрить доступ', description: 'Решение фиксируется в audit trail.', href: '/admin', linkLabel: 'Открыть заявку', result: 'Роль и scope активны.' },
    ],
  },
]

export const verificationRecords: VerificationRecord[] = [
  { area: 'Авторизация и 14 профилей', href: '/auth/sign-in', checked: '12 августа 2026', result: 'Выбор профиля, SSO-переход, MFA и стартовая страница работают.' },
  { area: 'Ролевая навигация', href: '/profile', checked: '12 августа 2026', result: 'Для R1–R14 проверен фактический состав меню по permissions.' },
  { area: 'Общая платформа', href: '/work/workflows', checked: '12 августа 2026', result: 'Главная, задачи, workflow, уведомления и профиль загружаются с данными.' },
  { area: 'Геология', href: '/objects/wells/WELL-1042?tab=passport', checked: '12 августа 2026', result: 'Обзор, карта, реестр, создание, 11 вкладок карточки, compare, correlation, reserves и delivery доступны.' },
  { area: 'Геологическое действие', href: '/geology/reserves', checked: '12 августа 2026', result: '«Передать на review» меняет состояние на «Передано».' },
  { area: 'Технология', href: '/technology', checked: '12 августа 2026', result: 'Все 9 экранов загружаются с данными и рабочими действиями.' },
  { area: 'Технологическое действие', href: '/technology/balance', checked: '12 августа 2026', result: 'Запрос повторного замера создаёт задачу диспетчеру; пауза РВР меняет состояние исполнения.' },
  { area: 'Моделирование', href: '/modeling', checked: '12 августа 2026', result: 'Создание snapshot, запуск, завершение расчёта и переход к RESULT-07 работают.' },
  { area: 'Аналитика', href: '/analytics', checked: '12 августа 2026', result: 'Выбор WELL-1051 синхронно обновляет inspector; решение и отчёт доступны.' },
  { area: 'Администрирование', href: '/admin', checked: '12 августа 2026', result: 'Выбор пользователя, effective permissions и одобрение ACC-019 работают.' },
]

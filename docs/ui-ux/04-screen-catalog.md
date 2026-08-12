# Реестр экранов интерактивного прототипа

## 1. Как читать реестр

- **P0** — обязателен для первого связного demo и базовой кодовой платформы.
- **P1** — обязателен для полного показа модуля.
- **P2** — расширение после валидации базовых процессов.
- `Page` — отдельный маршрут; `Workspace` — сложная рабочая область; `Drawer/Modal/Wizard` — вложенный сценарий.

Все P0/P1-экраны должны иметь состояния из раздела 12 [информационной архитектуры](./03-information-architecture.md). Реестр задаёт UX-покрытие, но не означает отдельный React-файл для каждой строки: общие формы, карточки и инспекторы переиспользуются.

### Реализованный геологический срез на 10.08.2026

- `GEO-01`, `GEO-03`, `GEO-04` — кликабельны и связаны общим состоянием фильтра через URL;
- `GEO-05` — функциональный wizard, создающий synthetic draft;
- `GEO-06` — редактируемый паспорт/конструкция, version impact и сохранение demo-версии;
- `GEO-07`, `GEO-08` — синхронные рейсы/глубинный трек и реестр керновых коробок;
- `GEO-17`, `GEO-18` — рабочее сравнение и экспертное решение;
- источником фактической готовности остаётся `docs/implementation-status.md`.

## 2. Авторизация, профиль и общий shell

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| AUTH-01 | Корпоративный вход SSO | Page | P0 | `/auth/sign-in` |
| AUTH-02 | Локальный резервный вход | Page | P0 | `/auth/local` |
| AUTH-03 | MFA: код/повтор/резервный способ | Page | P0 | `/auth/mfa` |
| AUTH-04 | Запрос доступа | Wizard | P1 | `/auth/request-access` |
| AUTH-05 | Учётная запись заблокирована | Page | P0 | `/auth/locked` |
| AUTH-06 | Сессия истекает / повторный вход | Modal/Page | P0 | global |
| AUTH-07 | Нет прав / область недоступна | Page | P0 | `/forbidden` |
| AUTH-08 | Ошибка SSO/инфраструктуры | Page | P1 | `/auth/error` |
| HOME-01 | Ролевой рабочий стол | Page | P0 | `/home` |
| WORK-01 | Мои задачи и согласования | Page | P0 | `/work` |
| WORK-02 | Карточка задачи | Drawer | P0 | `/work/:id` |
| GLB-01 | Глобальный поиск | Overlay/Page | P0 | `/search` |
| GLB-02 | Палитра команд | Overlay | P1 | shortcut |
| GLB-03 | Центр уведомлений | Drawer/Page | P0 | `/notifications` |
| GLB-04 | Избранное и недавние | Page | P1 | `/activity` |
| GLB-05 | Фоновые задачи | Page | P0 | `/data/jobs` |
| GLB-06 | Карточка фоновой задачи и журнал | Drawer | P0 | `/data/jobs/:id` |
| GLB-07 | Центр файлов и документов | Page | P1 | `/data/files` |
| GLB-08 | История отчётов и экспортов | Page | P1 | `/data/exports` |
| PROF-01 | Профиль пользователя | Page | P0 | `/profile` |
| PROF-02 | Предпочтения: язык, тема, формат | Page | P1 | `/profile/preferences` |
| PROF-03 | Безопасность и активные сессии | Page | P1 | `/profile/security` |
| DEMO-01 | Переключатель demo-персоны | Modal | P0 | только DEMO |
| HELP-01 | Контекстная справка и глоссарий | Drawer/Page | P1 | `/help` |

## 3. Общие предметные экраны и процессы

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| OBJ-01 | Проводник объектов | Page | P0 | `/objects` |
| OBJ-02 | Единая карточка скважины | Page | P0 | `/objects/wells/:id` |
| OBJ-03 | Карточка блока | Page | P0 | `/objects/blocks/:id` |
| OBJ-04 | Карточка месторождения/участка | Page | P1 | `/objects/sites/:id` |
| OBJ-05 | Связи объекта | Workspace | P1 | вкладка карточки |
| VER-01 | История версий | Tab/Page | P0 | object tab |
| VER-02 | Сравнение версий | Workspace | P0 | `?compare=` |
| APR-01 | Согласование/утверждение | Drawer | P0 | object action |
| APR-02 | Возврат на доработку | Modal | P0 | object action |
| CMT-01 | Комментарии, упоминания, вложения | Drawer | P1 | object panel |
| AUD-01 | Аудит объекта | Tab | P1 | object tab |
| IMP-01 | Выбор источника импорта | Wizard | P0 | `/data/imports/new` |
| IMP-02 | Сопоставление колонок/полей | Wizard | P0 | import step |
| IMP-03 | Валидация и исправление | Workspace | P0 | import step |
| IMP-04 | Результат, протокол, повтор | Page | P0 | `/data/imports/:id` |
| EXP-01 | Настройка экспорта | Wizard | P0 | context action |
| RPT-01 | Каталог отчётов и шаблонов | Page | P0 | `/data/reports` |
| RPT-02 | Конструктор/параметры отчёта | Workspace | P1 | `/data/reports/:id` |
| DQ-01 | Центр качества данных | Page | P0 | `/data/quality` |
| DQ-02 | Карточка проблемы качества | Drawer | P0 | quality item |

## 4. Геологический модуль

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| GEO-01 | Обзор модуля | Page | P0 | `/geology` |
| GEO-02 | Реестр месторождений и участков | Page | P1 | `/geology/deposits` |
| GEO-03 | Карта скважин и объектов | Workspace | P0 | `/geology/map` |
| GEO-04 | Реестр скважин | Page | P0 | `/geology/wells` |
| GEO-05 | Создание/редактирование скважины | Wizard | P0 | `/geology/wells/new` |
| GEO-06 | Паспорт и конструкция скважины | Tab | P0 | карточка скважины |
| GEO-07 | Рейсы бурения и выход керна | Workspace | P1 | well tab |
| GEO-08 | Керн, коробки и фотографии | Workspace | P1 | well tab |
| GEO-09 | Литология и стратиграфия по интервалам | Workspace | P0 | well tab |
| GEO-10 | Опробование и пробы | Workspace | P0 | карточка скважины `?tab=samples` |
| GEO-11 | Лабораторные результаты и QA/QC | Workspace | P1 | sample tab |
| GEO-12 | Геофизические исследования: реестр | Page | P0 | `/geology/logs` |
| GEO-13 | Импорт LAS/DAT | Wizard | P0 | `/geology/logs/import` |
| GEO-14 | Просмотрщик каротажных кривых | Workspace | P0 | `/geology/logs/:id` |
| GEO-15 | Ручная интерпретация ГИС | Workspace | P0 | `/geology/interpretations/:id/manual` |
| GEO-16 | AI-интерпретация и объяснение | Workspace | P0 | `/geology/interpretations/:id/ai` |
| GEO-17 | Сравнение ручной и AI-интерпретации | Workspace | P0 | `/geology/interpretations/:id/compare` |
| GEO-18 | Экспертное разрешение расхождений | Workspace | P0 | compare action |
| GEO-19 | Геологическая колонка | Workspace | P0 | `/geology/columns/:wellId` |
| GEO-20 | Шаблоны колонок/планшетов | Page/Editor | P1 | `/geology/templates/columns` |
| GEO-21 | Геологическая карта и слои | Workspace | P0 | `/geology/maps` |
| GEO-22 | Геологические разрезы | Workspace | P0 | `/geology/correlation` (demo A–A′) |
| GEO-23 | Редактор трассы разреза | Workspace | P1 | `/geology/sections/new` |
| GEO-24 | Корреляция горизонтов и пластов | Workspace | P1 | `/geology/correlation` (demo) |
| GEO-32 | Публикация геологической версии | Page | P0 | `/geology/delivery` (demo) |
| GEO-25 | Контуры рудных тел | Workspace | P1 | `/geology/ore-bodies` |
| GEO-26 | Объёмная/поверхностная модель | Workspace | P2 | `/geology/3d` |
| GEO-27 | Проекты подсчёта запасов | Page | P0 | `/geology/reserves` |
| GEO-28 | Параметры метода подсчёта | Wizard | P0 | `/geology/reserves/:id/setup` |
| GEO-29 | План/контуры подсчётных блоков | Workspace | P0 | `/geology/reserves/:id/plan` |
| GEO-30 | Таблица расчёта запасов | Workspace | P0 | `/geology/reserves/:id/results` |
| GEO-31 | Паспорт блока запасов | Page | P0 | `/geology/reserves/blocks/:id` |
| GEO-32 | Проверка и утверждение запасов | Workspace | P0 | reserve approval |
| GEO-33 | Отчёты и графические приложения | Page | P1 | `/geology/reports` |

## 5. Технологический модуль

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| TECH-01 | Обзор модуля и состояние участка | Page | P0 | `/technology` |
| TECH-02 | Иерархия технологических объектов | Page | P0 | `/technology/objects` |
| TECH-03 | Интерактивная технологическая схема | Workspace | P0 | `/technology/scheme` |
| TECH-04 | История связей и переподключений | Workspace | P1 | scheme timeline |
| TECH-05 | Паспорт технологической скважины | Tab | P0 | карточка скважины |
| TECH-06 | Оперативные замеры и сменный ввод | Workspace | P0 | `/technology/measurements` |
| TECH-07 | Пакетный ввод/импорт замеров | Wizard | P0 | measurement action |
| TECH-08 | Состав растворов и химические анализы | Workspace | P0 | `/technology/solutions` |
| TECH-09 | План отбора проб и LIMS-импорт | Workspace | P1 | `/technology/lab` |
| TECH-10 | Потоки и материальный баланс | Workspace | P0 | `/technology/flow-balance` |
| TECH-11 | Баланс кислоты и удельный расход | Workspace | P0 | `/technology/acid` |
| TECH-12 | Отклонения и технологические ограничения | Page | P0 | `/technology/deviations` |
| TECH-13 | Реестр насосного оборудования | Page | P0 | `/technology/equipment` |
| TECH-14 | Карточка насоса/двигателя/ПНА | Page | P0 | `/technology/equipment/:id` |
| TECH-15 | Монтаж, демонтаж, ремонт и наработка | Timeline | P1 | equipment tab |
| TECH-16 | Планирование РВР | Workspace | P0 | `/technology/rvr/plan` |
| TECH-17 | Наряд/задание РВР | Page/Form | P0 | `/technology/rvr/jobs/:id` |
| TECH-18 | Мобильный сценарий выполнения РВР | Page | P0 | `/technology/rvr/execute/:id` |
| TECH-19 | Результат и оценка эффективности РВР | Workspace | P0 | `/technology/rvr/results/:id` |
| TECH-20 | Технологические ГИС | Workspace | P1 | `/technology/logs` |
| TECH-21 | Суточный отчёт | Page/Preview | P0 | `/technology/reports/daily` |
| TECH-22 | Месячный/квартальный отчёт | Page/Preview | P1 | `/technology/reports/periodic` |
| TECH-23 | План-факт производственных показателей | Workspace | P0 | `/technology/plan-fact` |
| TECH-24 | AI-анализ и рекомендации | Page | P1 | `/technology/ai` |

## 6. Модуль моделирования

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| MOD-01 | Реестр проектов моделирования | Page | P0 | `/modeling/projects` |
| MOD-02 | Создание проекта из утверждённых данных | Wizard | P0 | `/modeling/projects/new` |
| MOD-03 | Рабочая область проекта | Workspace | P0 | `/modeling/projects/:id` |
| MOD-04 | Дерево объектов и инспектор | Panel | P0 | project workspace |
| MOD-05 | Область моделирования и сетка | Workspace | P0 | project tab |
| MOD-06 | Слои, массивы и поля | Workspace | P0 | project tab |
| MOD-07 | Импорт и интерполяция параметров | Wizard/Workspace | P1 | project action |
| MOD-08 | Ячейки и расчётные блоки | Workspace | P1 | project tab |
| MOD-09 | Скважины и режимы работы | Workspace | P0 | project tab |
| MOD-10 | Физико-химические параметры | Workspace | P0 | project tab |
| MOD-11 | Граничные и начальные условия | Workspace | P0 | project tab |
| MOD-12 | Сценарии и варианты | Page/Drawer | P0 | project scenarios |
| MOD-13 | Предрасчётная проверка | Modal/Page | P0 | run action |
| MOD-14 | Запуск и мониторинг расчёта | Page | P0 | `/modeling/runs/:id` |
| MOD-15 | Журнал и диагностика ошибки | Drawer/Page | P0 | run tab |
| MOD-16 | Карты результатов | Workspace | P0 | run result tab |
| MOD-17 | Профили и разрезы результатов | Workspace | P1 | run result tab |
| MOD-18 | Временные графики по точке/объекту | Workspace | P0 | run result tab |
| MOD-19 | Сравнение сценариев | Workspace | P0 | `/modeling/compare` |
| MOD-20 | Валидация по факту | Workspace | P0 | run validation tab |
| MOD-21 | Версия, публикация и отзыв результата | Workflow | P0 | run action |
| MOD-22 | Экспорт расчётных массивов и отчёта | Wizard | P1 | run action |

## 7. Экспертно-аналитический модуль

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| AN-01 | Аналитический обзор | Page | P0 | `/analytics` |
| AN-02 | Интерактивный план «на дату» | Workspace | P0 | `/analytics/map` |
| AN-03 | Каталог тематических слоёв | Drawer | P0 | map panel |
| AN-04 | Инспектор объекта на карте | Drawer | P0 | map selection |
| AN-05 | Динамика показателя | Workspace | P0 | `/analytics/trends` |
| AN-06 | Конструктор выборки | Workspace | P0 | `/analytics/selection` |
| AN-07 | Таблица и статистика выборки | Workspace | P0 | selection tab |
| AN-08 | Диаграммы распределения и scatter | Workspace | P1 | selection tab |
| AN-09 | Корреляционный анализ | Workspace | P1 | `/analytics/correlations` |
| AN-10 | Факт / модель / прогноз | Workspace | P0 | `/analytics/fact-model` |
| AN-11 | Реестр отклонений | Page | P0 | `/analytics/deviations` |
| AN-12 | Карточка отклонения и причины | Workspace | P0 | `/analytics/deviations/:id` |
| AN-13 | Рекомендация и управленческое решение | Workflow | P0 | deviation action |
| AN-14 | Паспорт скважины/блока для руководителя | Page | P0 | analytics object view |
| AN-15 | Конструктор аналитического отчёта | Workspace | P1 | `/analytics/reports/new` |
| AN-16 | Сохранённые виды и совместные ссылки | Page | P1 | `/analytics/views` |

## 8. Администрирование

| ID | Экран | Тип | Приоритет | Маршрут / вызов |
|---|---|---|---|---|
| ADM-01 | Обзор состояния системы | Page | P0 | `/admin` |
| ADM-02 | Пользователи | Page | P0 | `/admin/users` |
| ADM-03 | Карточка пользователя, роли и области | Page | P0 | `/admin/users/:id` |
| ADM-04 | Приглашения и запросы доступа | Page | P0 | `/admin/access-requests` |
| ADM-05 | Роли и матрица permissions | Workspace | P0 | `/admin/roles` |
| ADM-06 | Организационная структура и области | Workspace | P0 | `/admin/scopes` |
| ADM-07 | Справочники и классификаторы | Page | P0 | `/admin/dictionaries` |
| ADM-08 | Версии и публикация справочника | Workspace | P0 | `/admin/dictionaries/:id` |
| ADM-09 | Нормативы и расчётные параметры | Page | P1 | `/admin/norms` |
| ADM-10 | Шаблоны форм, колонок и отчётов | Page | P1 | `/admin/templates` |
| ADM-11 | Интеграции и коннекторы | Page | P0 | `/admin/integrations` |
| ADM-12 | Карточка интеграции, очередь и retry | Page | P0 | `/admin/integrations/:id` |
| ADM-13 | Планировщик процессов | Page | P1 | `/admin/schedules` |
| ADM-14 | Общесистемный аудит | Page | P0 | `/admin/audit` |
| ADM-15 | Мониторинг компонентов | Page | P1 | `/admin/monitoring` |
| ADM-16 | Резервное копирование/восстановление | Page | P2 | `/admin/backups` |
| ADM-17 | AI-модели и версии | Page | P0 | `/admin/ai/models` |
| ADM-18 | Карточка модели, метрики и датасеты | Page | P0 | `/admin/ai/models/:id` |
| ADM-19 | Сравнение/публикация/откат модели | Workflow | P0 | model action |
| ADM-20 | Настройки среды, локализации и feature flags | Page | P1 | `/admin/settings` |

## 9. Покрытие первого вертикального среза

Первый сквозной demo обязан связать минимум следующие экраны:

`AUTH-01 → AUTH-03 → HOME-01 → GEO-03 → OBJ-02 → GEO-13 → GEO-14 → GEO-15/GEO-16 → GEO-17 → GEO-18 → APR-01 → GLB-03 → AN-02`

Второй срез:

`TECH-01 → TECH-03 → TECH-06 → TECH-10 → TECH-12 → TECH-16 → TECH-17 → TECH-18 → TECH-19 → TECH-21`

Третий срез:

`MOD-01 → MOD-02 → MOD-03 → MOD-13 → MOD-14 → MOD-16 → MOD-20 → MOD-21 → AN-10`

## 10. Диалоги, которые нельзя оставлять browser-native

- подтверждение архивирования/отзыва;
- причина изменения утверждённых данных;
- конфликт параллельного редактирования;
- потеря несохранённых изменений;
- массовая операция и её область;
- согласование, отказ и возврат;
- запуск расчёта с зафиксированными входами;
- экспорт чувствительных данных;
- переключение контекста с изменённой формой;
- истечение сессии.

Каждый такой диалог показывает предметное действие, объект, последствия, доступную отмену и идентификатор операции/аудита после успеха.

## 11. Встроенный справочный центр

| ID | Экран | Тип | Приоритет | Route |
|---|---|---|---:|---|
| HELP-01 | Обзор и поиск по руководству | Page | P0 | `/help` |
| HELP-02 | Быстрый старт | Guide | P0 | `/help/start` |
| HELP-03 | Каталог ролей R1–R14 | Catalog | P0 | `/help/roles` |
| HELP-04 | Руководство выбранной роли | Guide | P0 | `/help/roles/:roleId` |
| HELP-05 | Каталог модулей и страниц | Catalog | P0 | `/help/modules` |
| HELP-06 | Руководство выбранного модуля | Guide | P0 | `/help/modules/:moduleId` |
| HELP-07 | Сквозные межролевые процессы | Guide | P0 | `/help/flows` |
| HELP-08 | Реестр проверенных маршрутов и действий | Page | P0 | `/help/verification` |

Справочный центр является самостоятельным удаляемым модулем `src/help-center/`. Все предметные ссылки относительные и открывают текущие маршруты приложения с сохранением активной сессии.

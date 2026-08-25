# Матрица визуального QA прототипа

Дата начала: 24.08.2026  
Статус: подготовлено к browser-проходу; результаты вносятся только после осмотра живого интерфейса.

## Как проводить проверку

Каждый маршрут открывается в авторизованной demo-сессии и проверяется в трёх
ширинах: `1440 px`, `1024 px` и `390 px`. Для сложных профессиональных
workspace на телефоне допустима упрощённая read-only подача или понятное
предложение открыть рабочий экран; скрытое переполнение, обрезанный контент и
недоступные основные действия недопустимы.

Для каждого экрана фиксируются: визуальная иерархия, читаемость (не менее
12 px для служебного текста), один главный action в зоне, статус/версия/источник,
focus, контентное и layout-переполнение, а также loading/empty/error/read-only
там, где состояние доступно через UI.

## Очередь маршрутов

| Группа | Маршруты для последовательного осмотра | Результат |
|---|---|---|
| Вход и shell | `/auth/sign-in`, `/auth/mfa`, `/home`, `/work`, `/work/workflows`, `/notifications`, `/profile`, `/forbidden` | Не начато |
| Геология: входные экраны | `/geology`, `/geology/master`, `/geology/methodology`, `/geology/map`, `/geology/wells`, `/geology/wells/new` | Не начато |
| Геология: объект и интерпретация | `/objects/wells/WELL-1010-FULL`, `/objects/wells/WELL-1042`, `/geology/interpretations/INT-WELL-1042-07/compare` | Не начато |
| Геология: выдача результата | `/geology/correlation`, `/geology/reserves`, `/geology/delivery` | Не начато |
| Технология | `/technology`, `/technology/measurements`, `/technology/solutions`, `/technology/balance`, `/technology/equipment`, `/technology/rvr/DEV-042`, `/technology/logs`, `/technology/plan-fact`, `/technology/recommendations` | Не начато |
| Моделирование | `/modeling`, `/modeling/workspace/MOD-PR-07`, `/modeling/run/MOD-PR-07`, `/modeling/results/MOD-PR-07`, `/modeling/compare` | Не начато |
| Аналитика | `/analytics`, `/analytics/decision`, `/analytics/report` | Не начато |
| Администрирование | `/admin`, `/admin/operations` | Не начато |
| Справочный центр | `/help`, `/help/start`, `/help/roles`, `/help/roles/R1`, `/help/roles/R14`, `/help/modules`, `/help/modules/geology`, `/help/flows`, `/help/verification`, `/help/accessibility` | Не начато |
| Системные | неизвестный маршрут (not-found), direct deep link с query (`asOf`, `selection`) | Не начато |

## Объекты особого визуального риска

- Плотные рабочие полотна: карта, журнал ГИС, разрез, запасы, моделирование,
  технологическая схема и аналитическая карта.
- Горизонтальные таблицы и вкладки: на `390 px` допускается только явная
  локальная прокрутка; shell и документ не должны становиться шире viewport.
- Многошаговые сценарии: создание скважины, LAS/DAT, РВР, запуск модели,
  публикация выдачи и администраторские изменения.
- Статусы, AI-метки и version metadata: должны оставаться текстово различимыми,
  не превращаться в кликабельные по виду badge и не вытеснять заголовок.

## Протокол фиксации

После обхода для каждого исправления в этом документе будут добавлены:

1. маршрут и ширина viewport;
2. наблюдаемая визуальная проблема;
3. изменённый компонент/стиль;
4. повторный browser-результат;
5. ссылка на проверку `typecheck`, `test` и `build` итогового состояния.

Матрица основана на `src/app/router.tsx`,
`docs/ui-ux/03-information-architecture.md`,
`docs/ui-ux/04-screen-catalog.md` и
`docs/ui-ux/06-design-system.md`. Она не заменяет фактический browser-QA.


## Подтверждено до browser-прохода

- Локальный dev-server теперь использует корневой base path: прямой переход
  на `http://127.0.0.1:4173/home` возвращает HTTP 200.
- Production build сохраняет GitHub Pages asset prefix
  `/kapgeo_prototype/`.
- `npm run typecheck`, `npm run test` (40 файлов, 98 тестов) и
  `npm run build` завершились успешно 24.08.2026.

Это подтверждает корректность точки входа, но не является результатом
визуального обхода: browser-осмотр остаётся в очереди.

## Результаты browser-QA — 24.08.2026

Проверены все маршруты из очереди выше в изолированном Chrome после demo
SSO/MFA. Для каждого маршрута снят desktop-кадр (`1440 px`), а на `390 px`
проверены responsive-состояние и отсутствие горизонтального переполнения.
Дополнительно `/home` проверен на `960 px`.

Исправления, подтверждённые повторным Chrome-проходом:

1. **Topbar, `/home`, 960 px.** Контекст и дата накладывались друг на друга.
   Добавлен промежуточный responsive-режим до `1120 px`: контекст сжимается,
   поиск становится icon-only, а селектор персоны — компактным. Повторно:
   overlap отсутствует, document overflow `false`.
2. **`/geology/methodology`, 1440 px.** Общий селектор
   `.contour-card > header > span` применял размеры круглого номера и к
   текстовому Badge — статус «Не рассмотрено» обрезался. Селектор ограничен
   первым `span`; статус имеет естественную ширину, overflow `false`.
3. **`/geology/delivery`, 390 px.** Ряд approval-actions растягивал документ
   до `544 px`. Для `.workflow-actions` включён перенос строк; повторно
   ширина `390 px`, actions `322/322`, overflow `false`.
4. **Локальный запуск.** Vite разделяет base path по режиму: `/home` доступен
   в dev, production-артефакт по-прежнему использует `/kapgeo_prototype/`.

Итоговые проверки: `typecheck` — успешно; `test` — 40 files / 98 tests;
`build` — успешно; `lint` — успешно без errors, с 3 существующими warnings
`react-hooks/exhaustive-deps`. Предупреждение bundle size Vite остаётся
известным ограничением, не регрессией QA.

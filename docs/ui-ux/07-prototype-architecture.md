# Архитектура прототипа

## Стек

React 19, strict TypeScript, Vite, TanStack Router/Query, Vitest, IndexedDB и автономное localStorage интерпретации. Локальный npm-пакет `@kapgeo/geo-viz` содержит Canvas wellog и зависит от `d3-scale`.

## Слои

`app → pages → features → entities → shared`

- `app` — bootstrap, router, providers, permission guard, верхний module shell и геологическая context navigation;
- `pages` — route-композиция геологии, профиля, заглушек и минимального администрирования;
- `features/geobase` — CRUD и URL-состояния БГД;
- `features/interpretation` — композиция планшета, формы, расчётный preview, модель истории и URL-состояния автономного среза;
- `entities` — session, geology-master, well, core, logs, lithology и ore types;
- `entities/interpretation` — согласованные synthetic fixtures, предметные команды и mapping керна;
- `repository` — детерминированные IndexedDB adapters;
- `repository/demo/interpretationRepository` — отдельный валидируемый localStorage adapter с ожидаемой ревизией;
- `shared` — permissions, geometry, intervals и UI-kit.

## Маршрутизация и состояние

В route tree присутствуют auth, БГД, интерпретация, profile, три module placeholder и admin. Server-like состояние хранится через TanStack Query, shareable selection — в URL, persistent synthetic records БГД — в IndexedDB. Интерпретация сохраняется независимо в `kapgeo.interpretation.demo.v1:<wellId>`, обновляя Query-cache при сохранении/сбросе. Выбор synthetic-персоны сохраняется в sessionStorage; доступ к маршруту проверяется по permission.

Mutation использует ожидаемую версию там, где требуется optimistic concurrency. Reset восстанавливает seed. Production backend, внешние интеграции и реальные учётные данные отсутствуют.

## Графический пакет

Wellog вынесен в `packages/geo-viz` как `file:packages/geo-viz`, а не связан абсолютным путём с другим checkout. Основа — snapshot основного frontend, интервалов/действий интерпретации в исходном пакете не было; адаптации перечислены в README пакета. Карта/OpenLayers и пакеты UI/API/auth основного frontend сюда не перенесены. История прототипа использует React reducer; перенос полного Zustand/zundo/MSW-стека не требовался для выбранной задачи. Кривые исключены из снимков истории, расчёт работает по полным данным, decimation сохраняет NaN-разрывы.

Во втором срезе `entities/interpretation/lib/calculation.ts` содержит оба demo-метода и средний КС; `core.ts` — соответствие срезов и связанные преобразования, `commands.ts` — операции интервалов. Документ хранит sourceRevision, исходные диапазоны сегментов, сводные свойства и отдельные пробы; отображаемые части и промер производятся из mapping. `NextEditors` и `ResultsTable` используют эти команды через атомарный commit/validation. Reset очищает history; старые localStorage bindings мигрируют без замены правок. [Точные ограничения](../task/interpretation-second-slice.md).

## Quality gates

`npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, browser smoke desktop/mobile и отсутствие console errors.

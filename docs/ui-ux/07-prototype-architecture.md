# Архитектура прототипа

## Стек

React 19, strict TypeScript, Vite, TanStack Router/Query, Vitest и IndexedDB.

## Слои

`app → pages → features → entities → shared`

- `app` — bootstrap, router, providers, permission guard, верхний module shell и геологическая context navigation;
- `pages` — route-композиция геологии, профиля, заглушек и минимального администрирования;
- `features/geobase` — CRUD и URL-состояния БГД;
- `entities` — session, geology-master, well, core, logs, lithology и ore types;
- `repository` — детерминированные IndexedDB adapters;
- `shared` — permissions, geometry, intervals и UI-kit.

## Маршрутизация и состояние

В route tree присутствуют auth, БГД, profile, три module placeholder и admin. Server-like состояние хранится через TanStack Query, shareable selection — в URL, persistent synthetic records — в IndexedDB. Выбор synthetic-персоны сохраняется в sessionStorage; доступ к маршруту проверяется по permission.

Mutation использует ожидаемую версию там, где требуется optimistic concurrency. Reset восстанавливает seed. Production backend, внешние интеграции и реальные учётные данные отсутствуют.

## Quality gates

`npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, browser smoke desktop/mobile и отсутствие console errors.

# GEOX-E02 — проверка well-master

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Граница

Это не production-модуль и не серверная БД. Данные детерминированно synthetic, сохраняются локально в IndexedDB `kapgeo-demo`, переживают reload и удаляются глобальным reset из профиля.

## Реализованные сценарии

- `/geology/master`: create/edit/archive месторождения, участка и залежи; коды неизменяемы, архивирование показывает dependency warning.
- Условия (ConditionSet): плотность, balance/off-balance thresholds, поправка азимута, допуск геометрии, effective date; draft → approve → publish и сравнение версий.
- `/geology/wells`: полный реестр, URL-selection, фильтры, сохраняемые views и grouping по участку/статусу.
- `/geology/wells/new`: принадлежность, проект, geometry/depth, duplicate-code и spatial check, construction seed.
- Карточка скважины: assignment и пять независимых агрегатов паспорта (описание, документация, проходка, освоение, геология).
- Construction: interval и point elements, diameter/type controls, depth validation, draft undo/redo и отдельная version history.
- Изменение координат, глубины, CRS, профиля и конструкции даёт impact preview и persisted stale dependencies.
- Workflow: draft → review → changes requested/approved → published → archived; published/archived read-only, новый draft создаётся от published snapshot.
- Permission scenario использует permission, а не имя роли: автор редактирует/отправляет, согласующий возвращает/утверждает, издатель публикует. Персону можно переключить через demo sign-in.

## Хранилище и evidence

Repositories работают через `DemoDatabase`: `records`, `versions`, `relations`, `auditEvents`, `preferences`. Новые скважины и master data остаются после reload; reset возвращает базовый seed и удаляет созданные записи.

## Проверки

Выполнено 24 августа 2026:

```text
npm run typecheck  — passed
npm run test       — 28 files, 72 tests passed
npm run build      — passed
```

Production build сообщает только стандартное предупреждение Vite о размере общего JS-chunk (>500 kB); это не ошибка сборки. Browser smoke в этой среде не запускался: локальный browser helper Windows sandbox недоступен. Поведение закреплено repository/unit и route tests; визуальная проверка остаётся задачей последующего browser QA эпика.


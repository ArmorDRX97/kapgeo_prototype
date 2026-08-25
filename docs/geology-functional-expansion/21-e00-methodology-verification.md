# GEOX-E00 — проверка методического центра и synthetic baseline

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Назначение

Маршрут `/geology/methodology` является интерактивным слоем передачи прототипа заказчикам, аналитикам, разработчикам и пользователям. Он не заменяет нормативную методику: исходный baseline имеет статус `unverified`, формулы являются маркированными synthetic examples, а перевод в `verified` — только versioned demo-решение пользователя с effective permission.

## Покрытие

| Задача | Проверяемый результат |
|---|---|
| T01 | Walkthrough показывает пять контуров, роли, операции и ограничения; для каждого сохраняется `confirmed/question`, комментарий и audit event. |
| T02 | Каталог содержит четыре методики, formula notation, units, required inputs, `verified/unverified` и запускаемые synthetic examples; результат создаёт `golden-example` artifact с DEMO-статусом. |
| T03 | Conditions/dictionaries имеют owner, effective date, value/unit, version, status и impact relations; новая версия не переписывает предыдущую запись versions. |
| T04 | Галерея паспорт/колонка/разрез/план запасов переключает selectable preview и скачивает synthetic preview manifest; template version отделена от scientific data. |
| T05 | Small/medium/large profile меняет число скважин, кривых, точек, ячеек и устройство; выбор сохраняется в records/preferences и явно не является SLA. |

## IndexedDB и reset

Repository записывает `methodology-center`, `walkthrough-decision`, `method-definition`, `condition-definition`, `dictionary-definition`, `output-template`, `volume-profile`, `versions`, `relations`, `auditEvents`, `artifacts` и `preferences`. Reload возвращает последнюю версию; optimistic conflict блокирует stale save; global reset восстанавливает пять `unreviewed` contours, четыре `unverified` methods, шаблон паспорта и `small` profile.

## Проверки

```text
Targeted UI/repository/route tests — 3 files, 4 tests passed
npm run typecheck                 — passed
npm run test                      — 40 files, 98 tests passed
npm run lint                      — 0 errors, 3 previous warnings
npm run build                     — passed; /kapgeo_prototype/
HTTP preview                      — entry 200, asset 200, E00 route present
```

Встроенный browser-control в этой сессии был недоступен из-за Windows sandbox helper; UI поведение дополнительно покрыто jsdom route test. Production bundle содержит `/geology/methodology` и загружается с GitHub Pages base path; push/deploy не выполнялся без отдельного поручения пользователя.


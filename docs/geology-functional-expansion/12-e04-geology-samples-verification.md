# GEOX-E04 — проверка литологии, проб и лаборатории

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Граница

Это не LIMS и не нормативный лабораторный расчёт. Данные детерминированно synthetic, сохраняются в IndexedDB `kapgeo-demo`, переживают reload и сбрасываются глобальным reset.

## Покрытие

| Задача | Проверяемый результат |
|---|---|
| T01 | Core/log/composite/stratigraphy tracks имеют отдельные IDs, source badges, versions и no-data state. |
| T02 | Effective dictionaries для литологии, минерализации, цвета и стратиграфии содержат локализованные RU/KZ/EN labels и versioned status. |
| T03 | Description override/grouping создаёт relation к source track, не изменяя source interval. |
| T04 | Stratigraphy draft поддерживает shift/copy, diff существующего редактора и undo/redo до save. |
| T05 | Sample v2 имеет несколько interval links, core/composite depth source и четыре family types. |
| T06 | Collection → request → laboratory → result → QA accepted/rejected переключается как сохраняемый demo workflow. |
| T07 | Lab results содержат qualifier, unit, method, analyst, uncertainty и QA/QC status. |
| T08 | Granulometry показывает bins, видимую histogram/cumulative шкалу, SGA/d10/d60 и synthetic method. |
| T09 | Batch create создаёт label/barcode data, browser label download и persisted sample-label artifact. |
| T10 | LIMS staging показывает conflict либо non-conflict staging; apply изменяет только non-conflict records и пишет audit/job. |

## Хранилище и проверки

Записываются `records`, `versions`, `relations`, `auditEvents`, `jobs`, `artifacts`. Repository tests подтверждают reload persistence tracks/sample links/audit, optimistic conflict, sample-label artifact, LIMS job и возврат seeded data после DemoDatabase reset.

```text
npm run typecheck — passed
npm run test      — 30 files, 77 tests passed
npm run build     — passed
```

Линтер не имеет ошибок; остаются 3 прежних предупреждения React Hooks вне E04. Browser smoke недоступен в текущей Windows sandbox среде.


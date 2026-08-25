# GEOX-E06 — проверка интерпретаций

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Граница

Это не production-engine KS, рудного содержания или AI-модель. Все интервалы, параметры, confidence и evidence детерминированно synthetic, сохраняются в IndexedDB и сбрасываются global reset.

## Покрытие

| Задача | Проверяемый результат |
|---|---|
| T01 | Manual permeable interval хранится как versioned depth track. |
| T02 | Auto KS создаёт видимый proposal с min-thickness rule, но не применяет его молча. |
| T03 | Filtration track хранит synthetic property, method и source. |
| T04 | Fake differential adapter создаёт preview interval. |
| T05 | Ore composite создаётся через demo connect/trim/split action и сохраняет diff artifact. |
| T06 | Tech alignment proposal создаётся с ore update в одной atomic workspace version. |
| T07 | `preliminary` и `no-correction` видимы и помечены как исключённые из reserve selector. |
| T08 | Manual track поддерживает несколько intervals, evidence и expert reason. |
| T09 | AI proposal содержит model version, confidence, calibration/evidence и не заменяет manual. |
| T10 | Human resolution создаёт accepted composite; review/approve/publish меняют workflow и пишут audit. |

## Хранилище и проверки

Записываются `records`, `versions`, `relations`, `auditEvents`, `jobs`, `artifacts`. Repository tests подтверждают persistence automatic/AI/resolved data, lineage relation и optimistic conflict.

```text
npm run typecheck — passed
npm run test      — 32 files, 81 tests passed
npm run build     — passed
```

Линтер не имеет ошибок; остаются 3 прежних React Hooks warnings вне E06.
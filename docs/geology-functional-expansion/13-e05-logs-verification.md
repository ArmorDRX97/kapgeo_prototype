# GEOX-E05 — проверка ГИС import и LogViewer

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Граница

Это не production LAS/DAT parser и не хранилище больших каротажных массивов. Детерминированные fixture-файлы, chunks и расчёты живут только в IndexedDB `kapgeo-demo`; после reload сохраняются, global reset возвращает seed.

## Покрытие

| Задача | Проверяемый результат |
|---|---|
| T01 | Bundled LAS и local DAT fixture создают metadata, size, checksum и raw-file artifact. |
| T02 | Parser profile LAS 2.0/DAT station даёт deterministic staging preview. |
| T03 | Mapping depth/unit/mnemonic/null и QC issues видны до apply. |
| T04 | Apply после явного QC создаёт новую LogRun/curve version; rejected rows и protocol сохраняются. |
| T05 | Viewer показывает bounded visible range и synthetic LOD chunk contract. |
| T06 | Tracks имеют scale, цвет, cursor, overlay, markers и доступный table registry fallback. |
| T07 | Layout template с order/range/overlay сохраняется отдельно от curve data. |
| T08 | Derived GR curve создаёт formula/lineage, job и artifact. |
| T09 | Merge preview создаёт новую curve version с synthetic priority formula. |
| T10 | Main GR nomination сохраняет proposed state и downstream stale impact. |

## Хранилище и проверки

Repository записывает `records`, `versions`, `relations`, `auditEvents`, `jobs`, `artifacts`, `preferences`. Тесты подтверждают reload persistence import/apply, raw artifact, lineage relation и optimistic conflict.

```text
npm run typecheck — passed
npm run test      — 31 files, 79 tests passed
npm run build     — passed
```

Линтер не имеет ошибок; остаются 3 прежних React Hooks warnings вне E05.
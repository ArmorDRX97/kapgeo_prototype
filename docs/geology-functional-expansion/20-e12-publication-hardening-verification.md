# GEOX-E12 — проверка publication, integrations и hardening

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Граница

Эпик не добавляет production backend, юридическую ЭЦП, внешние корпоративные интеграции или security certification. GitHub Pages остаётся статическим хостингом; версии, relations, handoff, notifications, QA evidence, артефакты и preferences живут в IndexedDB `kapgeo-demo` и возвращаются к deterministic seed глобальным reset.

## Покрытие задач

| Задача | Проверяемый результат |
|---|---|
| T01 | `/geology/delivery` композирует scope из пяти exact version references, consumers и явных limitations. |
| T02 | Approval проходит `draft → in_review/returned → reauthenticated → approved`; signature placeholder маркирован `NOT-LEGAL`. |
| T03 | Publish создаёт persisted handoff/relations для Technology, Modeling и Analytics; consumer pages показывают banner с package version и exact refs. |
| T04 | Withdraw и replacement сохраняют reason, прежние handoff, notifications и replacement package link. |
| T05 | PDF/JSON/snapshot создают manifest/checksum и browser artifact; история повторно скачивает запись, очистка удаляет только user-created artifacts. |
| T06 | RU/KZ/EN terminology и locale preference переключаются без reload; отсутствующее KZ-значение явно показывает `RU fallback`. |
| T07 | Contrast/reduced motion/density сохраняются и применяются AppShell; статусы имеют текстовые cues, labels и keyboard controls. |
| T08 | Small/medium/large profiles показывают loading, LOD, virtualization, row volume и маркированный demo budget. |
| T09 | File type/size denial, expression mock sandbox и permission-based sensitive export создают policy scenario/denial и audit. |
| T10 | 390/1024/1440 compatibility flags сохраняются; production build использует `/kapgeo_prototype/`, Pages workflow выполняет typecheck/test/lint/build. |
| T11 | Кликабельный regression фиксирует well → section → reserve → 2D/DGM → publication → reload/reset; repository suite реально проверяет persistence, conflict и reset. |
| T12 | Help Center описывает workspaces, synthetic/browser-only IndexedDB, snapshot export и полный reset; сохраняется `HELP-GEO-E12-v1`. |

## Хранилище

Используются `records`, `versions`, `relations`, `auditEvents`, `artifacts`, `preferences`; полный reset удаляет пользовательское состояние и восстанавливает seed. Handoff никогда не копирует «последние» данные: он содержит ID пакета, package version и массив exact version IDs.

## Проверки

```text
npm run typecheck — passed
npm run test      — 38 files, 95 tests passed
npm run build     — passed; /kapgeo_prototype/
HTTP preview      — index 200, JS asset 200
```

`npm run lint` — 0 ошибок, 3 ранее существовавших React Hooks warning вне E12. Встроенный browser-smoke в этой сессии не стартовал из-за Windows sandbox helper; это ограничение среды записано честно. Публичный GitHub Pages baseline и deploy workflow существуют; текущая E12-сборка будет опубликована штатным workflow после push в `main`, который не выполнялся без отдельного поручения пользователя.


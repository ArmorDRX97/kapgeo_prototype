# API and integration assumptions

Все UI-изменения сейчас живут в demo-state. Production API должен поддерживать:

- версионные сущности и immutable published snapshots;
- RBAC + scope и effective permission preview;
- cursor pagination, filtering, problem-details errors;
- background jobs: import, run, export, retry/cancel;
- audit events и source/provenance на каждом факте;
- contracts для LIMS, telemetry, GIS, solver и report generation.

Не передавать секреты интеграций в UI и не позволять AI автоматически менять режим/утверждать наряды.

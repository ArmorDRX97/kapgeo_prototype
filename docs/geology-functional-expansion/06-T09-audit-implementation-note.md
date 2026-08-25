# GEOX-E01-T09 Audit/evidence implementation note

## Цель этапа
Сформировать неизменяемую трассируемую историю для геологического модуля: все критичные операции должны оставлять append-only запись с полной привязкой к `actor`, `requestId`, `idempotencyKey`, входным данным и результату.

## Что включено в T09
- Базовый домен аудита (события, payload, статус, dedupe).
- Хранилище с append-only политикой и детерминированной сортировкой по `occurredAt`.
- Emitters для научных заданий: create/start/progress/retry/finish/fail/cancel.
- Подготовка интеграционного слоя для паспорта, версий, экспортов/расчетов/интерпретаций.
- Документируемые события и минимальный критерий принятия.

## Выполняемые файлы (этап сейчас)
- `src/shared/audit/types.ts`
- `src/shared/audit/utils.ts`
- `src/shared/audit/writer-contracts.ts`
- `src/shared/audit/writer.ts`
- `src/shared/audit/index.ts`
- `src/features/scientific-jobs/auditScienceJobEvents.ts`
- `docs/geology-functional-expansion/07-todo-for-t10.md` (next phase prep)

## Ключевые события для аудита
### Passport
- `passport.import.requested`
- `passport.import.imported`
- `passport.import.failed`

### Версия/статусы
- `version.created`
- `version.submitted`
- `version.returned`
- `version.approved`
- `version.rejected`
- `version.published`

### Научные задания
- `science.job.created`
- `science.job.started`
- `science.job.progress`
- `science.job.retry_scheduled`
- `science.job.cancelled`
- `science.job.finished`
- `science.job.failed`

### Расчеты/интерпретации/экспорт
- `calculation.requested`
- `calculation.started`
- `calculation.completed`
- `calculation.failed`
- `interpretation.saved`
- `interpretation.approved`
- `interpretation.reverted`
- `export.requested`
- `export.completed`
- `export.failed`

### Политика
- `policy.blocked.action`
- `policy.denied.by_scope`
- `policy.denied.by_status`

## Обязательные поля события
- `actor`, `eventType`, `entityType`, `entityId`, `occurredAt`, `status`.
- `requestId`, `idempotencyKey`, `traceId`, `sessionId`.
- `payload.inputSnapshot`, `payload.inputDigest`, `payload.resultRef`.
- `errorCode`/`errorMessage` для `failed`.
- `policyContext` для операций с отказами/ограничениями.

## План интеграции (непосредственно за код)
1. Передавать `idempotencyKey` в все write-операции, которые могут ретраить.
2. На вход `science job` и других long-running операций добавлять события на:
   - создание задачи;
   - старт обработки;
   - каждый значимый прогресс;
   - retry и cancel;
   - завершение/ошибку с результатом.
3. Добавить route/selection-aware UI `AuditTrail`:
   - фильтр по временному окну, событию, объекту, актеру;
   - ссылки на связанные карточки объекта (passport/version/job).
4. Вынести обязательный policy audit для action-guard в сервис доступа: при отклонении разрешения всегда писать `policy.*` событие.

## Acceptance criteria
- Находится цепочка событий хотя бы в формате `created -> started -> finished/failed`.
- Любая ошибка операции пишет `failed` событие с кодом/сообщением.
- Дубликаты не записываются при повторе запроса с одинаковым `idempotencyKey`.
- Лог неизменяем: только `append`, `query`, `get`, без `delete`.
- Критичный сценарий воспроизводится в 3 клика на экране audit-trail.

## Риски и вопросы
- Какой backend для production-аудита обязателен на следующей итерации (вставлять сейчас только контракт и in-memory/плейсхолдер)?
- Нужны ли поля сертификации/подписи на событие, или достаточно технической трассировки.
- Нужно ли включать хеш полной payload-структуры или только входных параметров.

## Статус этапа

Технический T09-контур закрыт как `foundation`: реализованы типы и контракты, in-memory append-only audit store, события `science.job.*` для create/start/progress/retry/cancel/finish/failed, dedupe по `requestId/idempotencyKey`, и покрытие детерминизма тестами. Полноценная интеграция audit UI/policy-deny и production persistence остаётся scope следующего среза (`T10`).

## Следующий шаг после кода T09
- Добавить `GEOX-E01-T10` (shared workspace contract) как обязательный слой между экранами и audit trail.


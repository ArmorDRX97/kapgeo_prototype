import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BookOpenCheck, Calculator, CheckCircle2, CircleHelp, Download, FileStack, Gauge, Layers3, Play, RotateCcw, Save, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import type { MethodologyCenterWorkspace, MethodologyContour, SyntheticMethodDefinition } from '../../entities/methodology-center/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchMethodologyCenterWorkspace, saveMethodologyCenterWorkspace } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

function downloadTemplate(name: string, body: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${name}.synthetic.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const decisionLabels = { unreviewed: 'Не рассмотрено', confirmed: 'Подтверждено', question: 'Есть вопрос' }

export function GeologyMethodologyPage() {
  const queryClient = useQueryClient()
  const { persona } = useSession()
  const query = useQuery({ queryKey: ['methodology-center'], queryFn: fetchMethodologyCenterWorkspace })
  const [selectedMethodId, setSelectedMethodId] = useState<SyntheticMethodDefinition['id']>('projection')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: ({ current, next, event }: { current: MethodologyCenterWorkspace; next: MethodologyCenterWorkspace; event: string }) => saveMethodologyCenterWorkspace(current, next, event),
    onSuccess: (next) => queryClient.setQueryData(['methodology-center'], next),
  })
  if (query.isLoading || !query.data) return <div className="page-loading"><span /><p>Загружаем определения, формулы и шаблоны…</p></div>
  if (query.isError) return <div className="form-alert form-alert--error">Не удалось открыть методический центр: {query.error.message}</div>

  const workspace = query.data
  const canEdit = hasPermission(persona, 'geology.well-master.edit')
  const canVerify = hasPermission(persona, 'geology.well-master.publish')
  const selectedMethod = workspace.methods.find((item) => item.id === selectedMethodId)!
  const selectedTemplate = workspace.templates.find((item) => item.id === workspace.selectedTemplateId)!
  const selectedVolume = workspace.volumeProfiles.find((item) => item.id === workspace.selectedVolumeProfileId)!
  const save = (next: MethodologyCenterWorkspace, event: string) => mutation.mutate({ current: workspace, next, event })
  const decide = (contour: MethodologyContour, decision: MethodologyContour['decision']) => save({ ...workspace, contours: workspace.contours.map((item) => item.id === contour.id ? { ...item, decision, note: notes[item.id] ?? item.note ?? (decision === 'question' ? 'Требуется уточнение заказчика.' : 'Walkthrough подтверждён.') } : item) }, `methodology.walkthrough.${decision}`)
  const runExample = (method: SyntheticMethodDefinition) => {
    const runNumber = method.runCount + 1
    const createdAt = new Date().toISOString()
    const artifactId = `ART-METHOD-${method.id}-V${method.version}-R${runNumber}`
    save({ ...workspace, methods: workspace.methods.map((item) => item.id === method.id ? { ...item, runCount: runNumber, lastArtifactId: artifactId } : item), exampleRuns: [...workspace.exampleRuns, { id: `RUN-${method.id}-V${method.version}-R${runNumber}`, methodId: method.id, methodVersion: method.version, result: method.exampleResult, unit: method.resultUnit, artifactId, status: 'synthetic-unverified', createdAt }] }, 'methodology.example.ran')
  }
  const verifyMethod = (method: SyntheticMethodDefinition) => save({ ...workspace, methods: workspace.methods.map((item) => item.id === method.id ? { ...item, status: item.status === 'verified' ? 'unverified' : 'verified', version: item.version + 1 } : item) }, 'methodology.method.status.changed')
  const versionDefinition = (id: string) => save({ ...workspace, definitions: workspace.definitions.map((item) => item.id === id ? { ...item, value: Number((item.value + (item.kind === 'condition' ? 0.01 : 1)).toFixed(3)), version: item.version + 1, status: 'unverified' } : item) }, 'methodology.definition.versioned')
  const verifyDefinition = (id: string) => save({ ...workspace, definitions: workspace.definitions.map((item) => item.id === id ? { ...item, status: item.status === 'verified' ? 'unverified' : 'verified', version: item.version + 1 } : item) }, 'methodology.definition.status.changed')
  const selectTemplate = (id: string) => save({ ...workspace, selectedTemplateId: id }, 'methodology.template.selected')
  const selectVolume = (id: MethodologyCenterWorkspace['selectedVolumeProfileId']) => save({ ...workspace, selectedVolumeProfileId: id }, 'methodology.volume.selected')
  const confirmed = workspace.contours.filter((item) => item.decision === 'confirmed').length

  return <div className="page-stack methodology-page">
    <PageHeader eyebrow="Геологический модуль · GEOX-E00" title="Методический центр прототипа" description="Интерактивная передача scope, правил, формул, шаблонов и demo-ограничений заказчикам, аналитикам и разработчикам." meta={<Badge tone={confirmed === 5 ? 'success' : 'warning'}>{confirmed}/5 контуров подтверждено · workspace v{workspace.version}</Badge>} actions={<Link to="/geology" className="button button--secondary button--md">К геологии</Link>} />
    <div className="methodology-boundary"><ShieldQuestion size={20} /><span><strong>Это specification aid, а не нормативная методика</strong><small>Все примеры synthetic. `Verified` означает зафиксированное demo-решение специалиста, но не заменяет нормативный документ, golden dataset и production validation.</small></span><Badge tone="danger">DEMO</Badge></div>
    {!canEdit && <div className="form-alert">Read-only: решения и версии доступны для просмотра; изменение определяется effective permission.</div>}
    {mutation.error && <div className="form-alert form-alert--error">{mutation.error.message}</div>}

    <Panel title="1. Walkthrough пяти контуров" description="Заказчик подтверждает охват или оставляет предметный вопрос"><div className="contour-walkthrough">{workspace.contours.map((contour) => <article key={contour.id} className={`contour-card contour-card--${contour.decision}`}><header><span>{contour.order}</span><div><h3>{contour.title}</h3><p>{contour.purpose}</p></div><Badge tone={contour.decision === 'confirmed' ? 'success' : contour.decision === 'question' ? 'warning' : 'neutral'}>{decisionLabels[contour.decision]}</Badge></header><div className="contour-card__columns"><div><strong>Роли</strong><ul>{contour.roles.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Ключевые операции</strong><ul>{contour.operations.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Demo-ограничения</strong><ul>{contour.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div></div><label className="field"><span className="field__label">Комментарий / вопрос</span><input value={notes[contour.id] ?? contour.note} onChange={(event) => setNotes((current) => ({ ...current, [contour.id]: event.target.value }))} placeholder="Что подтвердить или уточнить?" disabled={!canEdit} /></label><div className="workflow-actions"><Button size="sm" variant="secondary" disabled={!canEdit || mutation.isPending} onClick={() => decide(contour, 'question')}><CircleHelp size={14} /> Зафиксировать вопрос</Button><Button size="sm" disabled={!canEdit || mutation.isPending} onClick={() => decide(contour, 'confirmed')}><CheckCircle2 size={14} /> Подтвердить scope</Button></div></article>)}</div></Panel>

    <Panel title="2. Четыре методики и synthetic examples" description="Обозначения и единицы видимы; неподтверждённый результат всегда DEMO"><div className="method-tabs" role="tablist" aria-label="Методики подсчёта">{workspace.methods.map((method) => <button type="button" role="tab" aria-selected={method.id === selectedMethodId} className={method.id === selectedMethodId ? 'is-active' : ''} key={method.id} onClick={() => setSelectedMethodId(method.id)}>{method.shortName}<small>v{method.version} · {method.status}</small></button>)}</div><div className="method-detail"><div className="method-detail__main"><div className="method-title"><Calculator size={21} /><span><h3>{selectedMethod.name}</h3><p>{selectedMethod.description}</p></span><Badge tone={selectedMethod.status === 'verified' ? 'success' : 'danger'}>{selectedMethod.status === 'verified' ? 'VERIFIED DEMO' : 'UNVERIFIED DEMO'}</Badge></div><code className="formula-box">{selectedMethod.formula}</code><div className="formula-variables"><div><strong>Символ</strong><strong>Определение</strong><strong>Demo-значение</strong></div>{selectedMethod.variables.map((variable) => <div key={variable.symbol}><code>{variable.symbol}</code><span>{variable.label}</span><span>{variable.demoValue.toLocaleString('ru-RU')} {variable.unit}</span></div>)}</div><div className="workflow-actions"><Button size="sm" onClick={() => runExample(selectedMethod)} disabled={!canEdit || mutation.isPending}><Play size={14} /> Запустить synthetic example</Button><Button size="sm" variant="secondary" onClick={() => verifyMethod(selectedMethod)} disabled={!canVerify || mutation.isPending}><Save size={14} /> {selectedMethod.status === 'verified' ? 'Вернуть unverified' : 'Зафиксировать verified'}</Button></div></div><aside><strong>Обязательные входы</strong><ul>{selectedMethod.requiredInputs.map((item) => <li key={item}>{item}</li>)}</ul><div className="method-result"><span>Результат примера</span><strong>{selectedMethod.exampleResult.toLocaleString('ru-RU')} {selectedMethod.resultUnit}</strong><small>Запусков: {selectedMethod.runCount}. Не для производственного использования.</small></div>{selectedMethod.lastArtifactId && <Badge tone="info">{selectedMethod.lastArtifactId}</Badge>}</aside></div></Panel>

    <div className="methodology-two-column"><Panel title="3. Справочники и кондиции" description="Owner, effective date, version и impact preview"><div className="definition-list">{workspace.definitions.map((definition) => <article key={definition.id}><header><Layers3 size={18} /><span><strong>{definition.name}</strong><small>{definition.kind} · {definition.owner}</small></span><Badge tone={definition.status === 'verified' ? 'success' : 'danger'}>{definition.status}</Badge></header><dl><div><dt>Значение</dt><dd>{definition.value} {definition.unit}</dd></div><div><dt>Версия</dt><dd>v{definition.version}</dd></div><div><dt>Действует</dt><dd>{definition.effectiveFrom}</dd></div></dl><p><strong>Impact:</strong> {definition.impact.join(' → ')}</p><div className="workflow-actions"><Button size="sm" variant="secondary" disabled={!canEdit} onClick={() => versionDefinition(definition.id)}><RotateCcw size={14} /> Новая demo-версия</Button><Button size="sm" disabled={!canVerify} onClick={() => verifyDefinition(definition.id)}>{definition.status === 'verified' ? 'Отозвать verified' : 'Подтвердить'}</Button></div></article>)}</div></Panel>
      <Panel title="4. Галерея output templates" description="Selectable preview; template version не меняет scientific data"><div className="template-selector">{workspace.templates.map((template) => <button type="button" className={template.id === selectedTemplate.id ? 'is-active' : ''} key={template.id} onClick={() => selectTemplate(template.id)}><FileStack size={17} /><span><strong>{template.name}</strong><small>{template.pages} стр. · v{template.version}</small></span></button>)}</div><div className={`template-preview template-preview--${selectedTemplate.kind}`} aria-label={`Preview: ${selectedTemplate.name}`}><header><span>AI KAPGEO · SYNTHETIC</span><strong>{selectedTemplate.name}</strong></header><div className="template-preview__canvas"><i /><i /><i /><i /><i /><i /></div><footer>{selectedTemplate.description}</footer></div><Button size="sm" variant="secondary" onClick={() => downloadTemplate(selectedTemplate.id, { synthetic: true, template: selectedTemplate, selected: true })}><Download size={14} /> Скачать preview manifest</Button></Panel></div>

    <Panel title="5. Профиль демонстрационной нагрузки" description="Меняет synthetic scenario; показатели не являются SLA"><div className="volume-profile-grid">{workspace.volumeProfiles.map((profile) => <button type="button" key={profile.id} className={profile.id === selectedVolume.id ? 'is-active' : ''} onClick={() => selectVolume(profile.id)}><Gauge size={20} /><span><strong>{profile.label}</strong><small>{profile.device}</small></span><dl><div><dt>Скважин</dt><dd>{profile.wells.toLocaleString('ru-RU')}</dd></div><div><dt>Кривых</dt><dd>{profile.curves.toLocaleString('ru-RU')}</dd></div><div><dt>Точек</dt><dd>{profile.points.toLocaleString('ru-RU')}</dd></div><div><dt>Ячеек</dt><dd>{profile.cells.toLocaleString('ru-RU')}</dd></div></dl><p>{profile.note}</p></button>)}</div></Panel>

    <Panel title="Передача прототипа" description="Один центр для заказчика, аналитика, разработчика и пользователя"><div className="handoff-audiences"><article><BookOpenCheck size={19} /><strong>Заказчик</strong><span>Подтверждает scope, формулы и ограничения.</span></article><article><CircleHelp size={19} /><strong>Аналитик</strong><span>Фиксирует вопросы, owners и impact.</span></article><article><Calculator size={19} /><strong>Разработчик</strong><span>Получает versioned contracts и fixtures.</span></article><article><FileStack size={19} /><strong>Пользователь</strong><span>Понимает процесс и формы результата.</span></article></div></Panel>
  </div>
}

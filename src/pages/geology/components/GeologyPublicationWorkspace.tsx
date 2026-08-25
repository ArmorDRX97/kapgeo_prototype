import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Accessibility, Ban, CheckCircle2, Download, FileCheck2, Gauge, Languages, Link2, Play, RefreshCcw, RotateCcw, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { DemoLocale, GeologyPublicationWorkspace, PolicyScenario, PublicationConsumer } from '../../../entities/geology-publication/model/types'
import { useSession } from '../../../entities/session/model/sessionContext'
import { clearGeologyPublicationArtifacts, fetchGeologyPublicationWorkspace, fetchPlatformPreferences, saveGeologyPublicationWorkspace, savePlatformPreferences } from '../../../repository/api'
import { hasPermission } from '../../../shared/auth/permissions'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Panel } from '../../../shared/ui/Panel'

const consumerLabels: Record<PublicationConsumer, string> = { technology: 'Технология', modeling: 'Моделирование', analytics: 'Аналитика' }
const localeLabels: Record<DemoLocale, string> = { ru: 'Русский', kk: 'Қазақша', en: 'English' }
const statusLabels = { draft: 'Черновик', in_review: 'На проверке', returned: 'Возвращено', reauthenticated: 'Повторный вход', approved: 'Утверждено' }

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function GeologyPublicationWorkspace() {
  const queryClient = useQueryClient()
  const { persona } = useSession()
  const workspaceQuery = useQuery({ queryKey: ['geology-publication'], queryFn: fetchGeologyPublicationWorkspace })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const [reason, setReason] = useState('Пакет проверен по synthetic-сценарию')
  const [simulating, setSimulating] = useState(false)
  const saveMutation = useMutation({
    mutationFn: ({ current, next, event }: { current: GeologyPublicationWorkspace; next: GeologyPublicationWorkspace; event: string }) => saveGeologyPublicationWorkspace(current, next, event),
    onSuccess: (next) => {
      queryClient.setQueryData(['geology-publication'], next)
      for (const consumer of ['technology', 'modeling', 'analytics'] as const) void queryClient.invalidateQueries({ queryKey: ['geology-handoffs', consumer] })
    },
  })
  const preferencesMutation = useMutation({
    mutationFn: savePlatformPreferences,
    onSuccess: (next) => {
      queryClient.setQueryData(['platform-preferences'], next)
      document.documentElement.lang = next.locale
      document.documentElement.dataset.contrast = next.contrast ? 'high' : 'normal'
      document.documentElement.dataset.motion = next.reducedMotion ? 'reduced' : 'normal'
      document.documentElement.dataset.density = next.density
    },
  })
  const clearMutation = useMutation({ mutationFn: clearGeologyPublicationArtifacts, onSuccess: (next) => queryClient.setQueryData(['geology-publication'], next) })

  if (workspaceQuery.isLoading || preferencesQuery.isLoading || !workspaceQuery.data || !preferencesQuery.data) return <div className="page-loading"><span /><p>Загружаем пакет, handoff и QA evidence…</p></div>
  if (workspaceQuery.isError || preferencesQuery.isError) return <div className="form-alert form-alert--error">Не удалось открыть publication workspace.</div>

  const workspace = workspaceQuery.data
  const preferences = preferencesQuery.data
  const save = (next: GeologyPublicationWorkspace, event: string) => saveMutation.mutate({ current: workspace, next, event })
  const toggleVersion = (id: string) => save({ ...workspace, selectedVersionIds: workspace.selectedVersionIds.includes(id) ? workspace.selectedVersionIds.filter((item) => item !== id) : [...workspace.selectedVersionIds, id], publication: { status: 'draft' } }, 'publication.scope.changed')
  const toggleConsumer = (consumer: PublicationConsumer) => save({ ...workspace, consumers: workspace.consumers.includes(consumer) ? workspace.consumers.filter((item) => item !== consumer) : [...workspace.consumers, consumer], publication: { status: 'draft' } }, 'publication.consumers.changed')
  const approval = (status: GeologyPublicationWorkspace['approval']['status'], event: string) => save({ ...workspace, approval: { ...workspace.approval, status, reason, ...(status === 'reauthenticated' ? { reauthenticatedAt: new Date().toISOString() } : {}), ...(status === 'approved' ? { signaturePlaceholder: 'DEMO-SIGNATURE-NOT-LEGAL' } : {}) } }, event)
  const publish = () => {
    const createdAt = new Date().toISOString()
    const packageVersion = workspace.version + 1
    const handoffs = workspace.consumers.map((consumer) => ({ id: `HANDOFF-${consumer}-V${packageVersion}`, consumer, packageId: workspace.id, packageVersion, exactVersionIds: workspace.selectedVersionIds, targetPath: `/${consumer}` as '/technology' | '/modeling' | '/analytics', status: 'available' as const, createdAt }))
    const notifications = workspace.consumers.map((consumer) => ({ id: `NOTIFY-published-${consumer}-V${packageVersion}`, kind: 'published' as const, consumer, message: `${workspace.id} v${packageVersion} доступен`, createdAt }))
    save({ ...workspace, publication: { status: 'published' }, handoffs, notifications: [...workspace.notifications, ...notifications] }, 'publication.published')
  }
  const withdraw = () => {
    const createdAt = new Date().toISOString()
    save({ ...workspace, publication: { status: 'withdrawn', reason }, handoffs: workspace.handoffs.map((item) => ({ ...item, status: 'withdrawn' })), notifications: [...workspace.notifications, ...workspace.consumers.map((consumer) => ({ id: `NOTIFY-withdrawn-${consumer}-V${workspace.version + 1}`, kind: 'withdrawn' as const, consumer, message: `${workspace.id} отозван: ${reason}`, createdAt }))] }, 'publication.withdrawn')
  }
  const replace = () => {
    const createdAt = new Date().toISOString()
    save({ ...workspace, publication: { status: 'replaced', reason, replacementPackageId: 'GEO-PKG-2026-09' }, handoffs: workspace.handoffs.map((item) => ({ ...item, status: 'replaced' })), notifications: [...workspace.notifications, ...workspace.consumers.map((consumer) => ({ id: `NOTIFY-replaced-${consumer}-V${workspace.version + 1}`, kind: 'replaced' as const, consumer, message: `${workspace.id} заменён GEO-PKG-2026-09`, createdAt }))] }, 'publication.replaced')
  }
  const addExport = (format: 'pdf' | 'json' | 'snapshot') => {
    const createdAt = new Date().toISOString()
    const id = `EXPORT-${format}-${workspace.version + 1}`
    const fileName = `${workspace.id}-v${workspace.version}.${format === 'snapshot' ? 'json' : format}`
    const item = { id, fileName, format, artifactId: `ART-${id}`, checksum: `demo-${workspace.id}-${workspace.version}-${format}`, userCreated: true, createdAt }
    save({ ...workspace, exports: [...workspace.exports, item] }, 'publication.export.created')
    download(fileName, JSON.stringify({ synthetic: true, package: workspace.id, version: workspace.version, exactVersionIds: workspace.selectedVersionIds, limitations: workspace.limitations }, null, 2), format === 'pdf' ? 'application/pdf' : 'application/json')
  }
  const runPolicy = (policy: PolicyScenario) => {
    const canExport = hasPermission(persona, 'geology.well-master.publish')
    const outcome = policy.id === 'expression' ? 'sandboxed' : policy.id === 'sensitive-export' && canExport ? 'allowed' : 'denied'
    save({ ...workspace, policies: workspace.policies.map((item) => item.id === policy.id ? { ...item, outcome } : item) }, `policy.${policy.id}.${outcome}`)
  }
  const runPerformance = async (profile: 'small' | 'medium' | 'large') => {
    setSimulating(true)
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    const settings = profile === 'large' ? { rows: 50_000, lod: 'LOD 2', virtualization: true, demoBudgetMs: 900 } : profile === 'medium' ? { rows: 5_000, lod: 'LOD 1', virtualization: true, demoBudgetMs: 420 } : { rows: 250, lod: 'LOD 0', virtualization: false, demoBudgetMs: 120 }
    save({ ...workspace, performance: { profile, ...settings, loadingState: 'ready' } }, 'performance.scenario.completed')
    preferencesMutation.mutate({ ...preferences, performanceProfile: profile })
    setSimulating(false)
  }
  const passWidth = (width: 390 | 1024 | 1440) => {
    save({ ...workspace, browserQa: workspace.browserQa.map((item) => item.width === width ? { ...item, status: 'passed' } : item) }, 'browser.qa.passed')
    preferencesMutation.mutate({ ...preferences, browserWidths: [...new Set([...preferences.browserWidths, width])] })
  }
  const runRegression = () => save({ ...workspace, regression: { ...workspace.regression, status: 'passed', createdAt: new Date().toISOString(), steps: workspace.regression.steps.map((step) => ({ ...step, status: 'passed' })) } }, 'regression.completed')
  const terminology = (id: string) => {
    const entry = workspace.terminology.find((item) => item.id === id)!
    return entry.labels[preferences.locale] ?? `${entry.labels.ru} · RU fallback`
  }

  return <div className="page-stack publication-workspace">
    <PageHeader eyebrow="Геологический модуль · GEOX-E12" title={terminology('package')} description="Versioned publication, fake consumer handoff и hardening кликабельного IndexedDB-прототипа." meta={<Badge tone={workspace.publication.status === 'published' ? 'success' : workspace.publication.status === 'withdrawn' ? 'danger' : 'warning'}>{workspace.publication.status} · v{workspace.version}</Badge>} actions={<Link to="/help/modules/$moduleId" params={{ moduleId: 'geology' }} className="button button--secondary button--md">Справка</Link>} />
    {(saveMutation.error || clearMutation.error || preferencesMutation.error) && <div className="form-alert form-alert--error">{String(saveMutation.error?.message ?? clearMutation.error?.message ?? preferencesMutation.error?.message)}</div>}

    <div className="publication-grid"><div className="publication-main">
      <Panel title="1. Composer exact versions" description="Scope, exact refs, consumers и limitations сохраняются до публикации"><div className="publication-refs">{workspace.scope.map((reference) => <label key={reference.id}><input type="checkbox" checked={workspace.selectedVersionIds.includes(reference.id)} onChange={() => toggleVersion(reference.id)} disabled={workspace.publication.status !== 'draft'} /><span><strong>{reference.label}</strong><small>{reference.entityType} · exact v{reference.version}</small></span></label>)}</div><div className="delivery-targets">{(Object.keys(consumerLabels) as PublicationConsumer[]).map((consumer) => <label key={consumer} className={workspace.consumers.includes(consumer) ? 'is-selected' : ''}><input type="checkbox" checked={workspace.consumers.includes(consumer)} onChange={() => toggleConsumer(consumer)} disabled={workspace.publication.status !== 'draft'} /><Link2 size={18} /><span><strong>{consumerLabels[consumer]}</strong><small>Fake adapter · exact version refs</small></span></label>)}</div><ul className="publication-limitations">{workspace.limitations.map((item) => <li key={item}>{terminology('limitation')}: {item}</li>)}</ul></Panel>
      <Panel title="2. Approval и publication history" description="Demo signature placeholder не является ЭЦП"><label className="field"><span className="field__label">Причина решения</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="workflow-actions"><Button size="sm" variant="secondary" disabled={workspace.approval.status !== 'draft' || reason.length < 8} onClick={() => approval('in_review', 'publication.review.requested')}>На проверку</Button><Button size="sm" variant="secondary" disabled={workspace.approval.status !== 'in_review'} onClick={() => approval('returned', 'publication.returned')}>Вернуть</Button><Button size="sm" variant="secondary" disabled={!['in_review', 'returned'].includes(workspace.approval.status)} onClick={() => approval('reauthenticated', 'publication.reauthenticated')}><RefreshCcw size={14} /> Reauth</Button><Button size="sm" disabled={workspace.approval.status !== 'reauthenticated'} onClick={() => approval('approved', 'publication.approved')}><ShieldCheck size={14} /> Signature placeholder</Button><Button size="sm" disabled={workspace.approval.status !== 'approved' || !workspace.selectedVersionIds.length || !workspace.consumers.length} onClick={publish}><Send size={14} /> Опубликовать</Button></div><div className="publication-state"><Badge tone={workspace.approval.status === 'approved' ? 'success' : 'info'}>{statusLabels[workspace.approval.status]}</Badge><span>{workspace.approval.signaturePlaceholder ?? 'Подпись отсутствует'}</span></div>{workspace.publication.status === 'published' && <div className="workflow-actions"><Button size="sm" variant="danger" onClick={withdraw}><Ban size={14} /> Отозвать</Button></div>}{workspace.publication.status === 'withdrawn' && <div className="workflow-actions"><Button size="sm" onClick={replace}><RotateCcw size={14} /> Заменить пакетом GEO-PKG-2026-09</Button></div>}{workspace.publication.replacementPackageId && <div className="form-alert">Replacement link: {workspace.publication.replacementPackageId}</div>}
        <div className="consumer-links">{workspace.handoffs.map((handoff) => <article key={handoff.id}><CheckCircle2 size={17} /><span><strong>{consumerLabels[handoff.consumer]}</strong><small>{handoff.packageId} · v{handoff.packageVersion} · {handoff.exactVersionIds.length} refs</small></span><Badge tone={handoff.status === 'available' ? 'success' : 'warning'}>{handoff.status}</Badge></article>)}</div></Panel>
      <Panel title="3. Exports и пользовательские артефакты" description="Повторное скачивание использует сохранённый manifest/checksum"><div className="workflow-actions"><Button size="sm" variant="secondary" onClick={() => addExport('pdf')}><Download size={14} /> PDF</Button><Button size="sm" variant="secondary" onClick={() => addExport('json')}><Download size={14} /> JSON</Button><Button size="sm" variant="secondary" onClick={() => addExport('snapshot')}><Download size={14} /> Snapshot</Button><Button size="sm" variant="danger" disabled={!workspace.exports.some((item) => item.userCreated)} onClick={() => clearMutation.mutate(workspace)}><Trash2 size={14} /> Очистить мои</Button></div><div className="export-history">{workspace.exports.length ? workspace.exports.map((item) => <article key={item.id}><FileCheck2 size={17} /><span><strong>{item.fileName}</strong><small>{item.checksum} · browser artifact</small></span><button type="button" className="text-link" onClick={() => download(item.fileName, JSON.stringify({ artifactId: item.artifactId, checksum: item.checksum, synthetic: true }), 'application/json')}>Скачать снова</button></article>) : <p className="save-hint">Пользовательских экспортов пока нет.</p>}</div></Panel>
    </div><aside className="publication-aside">
      <Panel title="RU / KZ / EN" description="Смена без reload; отсутствующий перевод имеет fallback"><div className="locale-switcher">{(Object.keys(localeLabels) as DemoLocale[]).map((locale) => <button type="button" key={locale} className={preferences.locale === locale ? 'is-active' : ''} onClick={() => preferencesMutation.mutate({ ...preferences, locale })}>{localeLabels[locale]}</button>)}</div><p>{terminology('approved')} · {terminology('limitation')}</p></Panel>
      <Panel title="Accessibility preferences" description="Keyboard, labels, reduced motion и non-color cues"><div className="accessibility-settings"><label><span><Accessibility size={17} /><strong>Высокий контраст</strong></span><input type="checkbox" checked={preferences.contrast} onChange={(event) => preferencesMutation.mutate({ ...preferences, contrast: event.target.checked })} /></label><label><span><Accessibility size={17} /><strong>Reduced motion</strong></span><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => preferencesMutation.mutate({ ...preferences, reducedMotion: event.target.checked })} /></label></div></Panel>
      <Panel title="Synthetic volume profile" description="Demo budgets, не SLA"><div className="performance-profiles">{(['small', 'medium', 'large'] as const).map((profile) => <button type="button" key={profile} className={workspace.performance.profile === profile ? 'is-active' : ''} onClick={() => void runPerformance(profile)}>{profile}</button>)}</div><div className="performance-result"><Gauge size={18} /><span><strong>{simulating ? 'Loading synthetic volume…' : `${workspace.performance.rows.toLocaleString('ru-RU')} rows · ${workspace.performance.lod}`}</strong><small>{workspace.performance.virtualization ? 'Virtualization on' : 'Direct render'} · demo budget {workspace.performance.demoBudgetMs} ms</small></span></div></Panel>
      <Panel title="Policy scenarios" description="Кликабельная демонстрация, не security claim"><div className="policy-list">{workspace.policies.map((policy) => <button type="button" key={policy.id} onClick={() => runPolicy(policy)}><span><strong>{policy.label}</strong><small>{policy.detail}</small></span><Badge tone={policy.outcome === 'denied' ? 'danger' : policy.outcome === 'idle' ? 'neutral' : 'success'}>{policy.outcome}</Badge></button>)}</div></Panel>
      <Panel title="Browser QA widths" description="Compatibility flags сохраняются локально"><div className="qa-widths">{workspace.browserQa.map((qa) => <button type="button" key={qa.width} className={qa.status === 'passed' ? 'is-passed' : ''} onClick={() => passWidth(qa.width)}><strong>{qa.width}px</strong><small>{qa.note}</small><span>{qa.status}</span></button>)}</div></Panel>
      <Panel title="Regression" description="well → section → reserve → model → publication → reload/reset"><div className="regression-steps">{workspace.regression.steps.map((step) => <span key={step.id}><i aria-hidden="true">{step.status === 'passed' ? '✓' : '○'}</i>{step.label}</span>)}</div><Button size="sm" onClick={runRegression} disabled={workspace.regression.status === 'passed'}><Play size={14} /> {workspace.regression.status === 'passed' ? 'Regression passed' : 'Запустить regression'}</Button></Panel>
      <Panel title="Help и reset" description={`${workspace.helpVersion} · browser-only synthetic data`}><p className="save-hint">Справка объясняет workspace, локальное хранение, snapshot export и полный reset.</p><div className="workflow-actions"><Link to="/help/modules/$moduleId" params={{ moduleId: 'geology' }} className="button button--secondary button--sm"><Languages size={14} /> Открыть справку</Link><Link to="/profile" className="button button--secondary button--sm"><RotateCcw size={14} /> Полный reset</Link></div></Panel>
    </aside></div>
  </div>
}


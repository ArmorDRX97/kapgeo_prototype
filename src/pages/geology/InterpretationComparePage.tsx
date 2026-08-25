import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Bot, Check, ChevronDown, CircleHelp, Eye, History, Layers3, MessageSquareText, RotateCcw, Save, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveInterpretationDecision, fetchInterpretationDecision, returnInterpretationDecision, saveInterpretationDecision, submitInterpretationDecision } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'

type Resolution = 'manual' | 'ai' | 'corrected' | null

const curvePath = 'M65 0 C28 42 97 71 54 112 S91 176 39 220 S101 283 57 326 S88 405 44 460 S86 520 61 570'

function InterpretationTrack({ mode }: { mode: 'manual' | 'ai' | 'resolved' }) {
  const isAi = mode === 'ai'
  return (
    <div className={`interpretation-track interpretation-track--${mode}`}>
      <div className="interpretation-track__head"><strong>{mode === 'manual' ? 'Ручная' : mode === 'ai' ? 'AI-интерпретация' : 'Результат'}</strong>{mode === 'ai' && <Badge tone="ai">0,82 confidence</Badge>}</div>
      <div className="interpretation-track__canvas">
        <svg viewBox="0 0 130 570" preserveAspectRatio="none" aria-label="Каротажная кривая"><path d={curvePath} /></svg>
        <span className="interval interval--top" style={{ top: isAi ? '34%' : '35.4%', height: isAi ? '22%' : '19.5%' }}><small>{isAi ? '284,1' : '288,4'} м</small><strong>Рудный</strong><small>{isAi ? '418,7' : '407,5'} м</small></span>
        {mode === 'resolved' && <span className="interval interval--resolved" style={{ top: '35%', height: '20.5%' }}><small>286,9 м</small><strong>Скорректировано</strong><small>411,8 м</small></span>}
        <span className="conflict-band" style={{ top: '34%', height: '3.2%' }} />
      </div>
    </div>
  )
}

export function InterpretationComparePage() {
  const interpretationId = 'INT-WELL-1042-07'
  const queryClient = useQueryClient()
  const decisionQuery = useQuery({ queryKey: ['interpretation-decision', interpretationId], queryFn: () => fetchInterpretationDecision(interpretationId) })
  const [resolution, setResolution] = useState<Resolution>(null)
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (!decisionQuery.data) return
    const syncTimer = window.setTimeout(() => {
      setResolution(decisionQuery.data!.resolution ?? null)
      setReason(decisionQuery.data!.reason)
    }, 0)
    return () => window.clearTimeout(syncTimer)
  }, [decisionQuery.data])
  const saveMutation = useMutation({
    mutationFn: () => saveInterpretationDecision(interpretationId, decisionQuery.data!, resolution!, reason),
    onSuccess: (next) => queryClient.setQueryData(['interpretation-decision', interpretationId], next),
  })
  const submitMutation = useMutation({
    mutationFn: () => submitInterpretationDecision(interpretationId, decisionQuery.data!),
    onSuccess: (next) => queryClient.setQueryData(['interpretation-decision', interpretationId], next),
  })
  const returnMutation = useMutation({
    mutationFn: () => returnInterpretationDecision(interpretationId, decisionQuery.data!),
    onSuccess: (next) => queryClient.setQueryData(['interpretation-decision', interpretationId], next),
  })
  const approveMutation = useMutation({
    mutationFn: () => approveInterpretationDecision(interpretationId, decisionQuery.data!),
    onSuccess: (next) => queryClient.setQueryData(['interpretation-decision', interpretationId], next),
  })
  const saved = Boolean(decisionQuery.data?.resolution)
  const submitted = decisionQuery.data?.status === 'in_review'
  const approved = decisionQuery.data?.status === 'approved'
  const saveResolution = () => { if (resolution && reason.trim()) void saveMutation.mutate() }
  if (decisionQuery.isLoading) return <div className="page-loading"><span /><p>Загружаем сохранённое экспертное решение…</p></div>

  return (
    <div className="compare-page">
      <header className="compare-header">
        <div>
          <Link to="/objects/wells/$wellId" params={{ wellId: 'WELL-1042' }} className="back-link"><ArrowLeft size={16} /> WELL-1042</Link>
          <div className="compare-header__title"><h1>Сравнение интерпретаций</h1><Badge tone={saved ? 'success' : 'warning'} dot>{saved ? 'Расхождение разрешено' : '1 расхождение'}</Badge></div>
          <p>INT-WELL-1042-07 · Набор LOG-2026-0418 · Версия AI KPG-GIS-2.4</p>
        </div>
        <div className="compare-header__actions"><Button variant="secondary"><MessageSquareText size={16} /> Комментарий</Button>{saved && !submitted && !approved && <Button variant="secondary" onClick={() => void submitMutation.mutate()}><Send size={16} /> На проверку</Button>}{submitted && <><Button variant="secondary" onClick={() => void returnMutation.mutate()} disabled={returnMutation.isPending}><RotateCcw size={16} /> Вернуть</Button><Button onClick={() => void approveMutation.mutate()} disabled={approveMutation.isPending}><ShieldCheck size={16} /> Утвердить</Button></>}<Button onClick={saveResolution} disabled={approved || !resolution || !reason.trim() || saveMutation.isPending}><Save size={16} /> Сохранить решение</Button></div>
      </header>

      <div className="compare-toolbar">
        <button type="button"><Layers3 size={16} /> Треки <ChevronDown size={14} /></button>
        <button type="button"><Eye size={16} /> Масштаб 1:500 <ChevronDown size={14} /></button>
        <span className="compare-toolbar__selection">Выбран конфликт · 284,1–288,4 м</span>
        <span className="compare-toolbar__source"><span /> Источники синхронизированы</span>
      </div>

      <div className="compare-workspace">
        <section className="compare-canvas">
          <div className="depth-ruler" aria-hidden="true">{['250', '300', '350', '400', '450', '500', '550'].map((depth) => <span key={depth}>{depth}</span>)}</div>
          <InterpretationTrack mode="manual" />
          <InterpretationTrack mode="ai" />
          <InterpretationTrack mode="resolved" />
        </section>

        <aside className="compare-inspector">
          <Panel>
            <div className="conflict-heading"><span><AlertTriangle size={20} /></span><div><p className="eyebrow">Конфликт 1 из 1</p><h2>Верхняя граница интервала</h2></div></div>
            <dl className="comparison-values"><div><dt><UserRound size={15} /> Ручная</dt><dd>288,4 м</dd></div><div><dt><Sparkles size={15} /> AI</dt><dd>284,1 м</dd></div><div className="comparison-values__delta"><dt>Расхождение</dt><dd>4,3 м</dd></div></dl>
            <div className="ai-evidence"><div><Bot size={17} /><strong>Почему AI выбрал эту границу</strong></div><p>Рост гамма-активности и изменение производной кривой совпали на глубине 284,1 м. Качество сигнала достаточное.</p><button type="button"><CircleHelp size={15} /> Показать признаки модели</button></div>
          </Panel>

          <Panel title="Экспертное решение" description="Выберите итог и зафиксируйте основание">
            <div className="resolution-options">
              <label className={resolution === 'manual' ? 'is-selected' : ''}><input type="radio" name="resolution" onChange={() => { setResolution('manual');  }} /><span><UserRound size={17} /><strong>Принять ручную</strong><small>288,4 м</small></span></label>
              <label className={resolution === 'ai' ? 'is-selected' : ''}><input type="radio" name="resolution" onChange={() => { setResolution('ai');  }} /><span><Sparkles size={17} /><strong>Принять AI</strong><small>284,1 м</small></span></label>
              <label className={resolution === 'corrected' ? 'is-selected' : ''}><input type="radio" name="resolution" onChange={() => { setResolution('corrected');  }} /><span><Check size={17} /><strong>Скорректировать</strong><small>286,9 м</small></span></label>
            </div>
            <label className="field"><span className="field__label">Основание решения <em>*</em></span><textarea rows={3} value={reason} onChange={(event) => { setReason(event.target.value);  }} placeholder="Опишите признаки и причину выбора…" /></label>
            {saved && <div className="success-message"><Check size={17} /><span><strong>{submitted ? 'Решение отправлено на проверку' : 'Решение сохранено'}</strong>{submitted ? 'Статус версии — «На проверке»; руководитель увидит обоснование и сравнение источников.' : 'Черновик результата обновлён; можно отправлять на проверку.'}</span></div>}
          </Panel>
          <Panel title="Аудит решения" description="События текущего процесса"><div className="audit-mini"><span><History size={15} /> AI KPG-GIS-2.4 предложил границу 284,1 м · confidence 0,82</span>{resolution && <span><UserRound size={15} /> Эксперт выбрал: {resolution === 'manual' ? 'ручную границу' : resolution === 'ai' ? 'AI-границу' : 'скорректированную границу'}</span>}{submitted && <span><Send size={15} /> Отправлено на проверку · версия результата фиксируется</span>}</div></Panel>
        </aside>
      </div>
    </div>
  )
}

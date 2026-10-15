import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Pause, Sparkles } from 'lucide-react'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import type { LearningPath } from '../../entities/knowledge/schema'
import type { ExplorerState } from '../explore/state'
import { Dialog } from '../../shared/Dialog'

export function LearningDialog({ index, progress, onClose, onStart }: { index: KnowledgeIndex; progress: ExplorerState['progress']; onClose: () => void; onStart: (id: string, restart?: boolean) => void }) {
  return <Dialog title="Изучайте шаг за шагом" onClose={onClose} className="learning-dialog">
    <p className="dialog-intro">Разные вопросы — одна связанная система. Каждый маршрут последовательно подсвечивает элементы карты и объясняет переходы простыми словами.</p>
    <div className="learning-grid">{index.learningPaths.map((path, i) => {
      const saved = progress[path.id]
      return <article key={path.id} className={`learning-card ${saved?.completed ? 'completed' : ''}`}><div className="learning-card-top"><span>{saved?.completed ? <CheckCircle2 size={23} /> : String(i + 1).padStart(2, '0')}</span><span><Clock3 size={13} />{path.duration}</span></div><h3>{path.title}</h3><p>{path.description}</p><div className="learning-meta">{path.steps.length} этапов{saved?.completed ? ' · Пройдено' : saved ? ` · Этап ${saved.step + 1}` : ' · Для новичка'}</div><button className="text-button" onClick={() => onStart(path.id, saved?.completed)}>{saved?.completed ? 'Пройти ещё раз' : saved ? 'Продолжить' : 'Начать маршрут'}<ArrowRight size={15} /></button></article>
    })}</div><p className="subtle-note"><BookOpen size={14} />Прогресс сохраняется в этом браузере. Можно остановиться и вернуться позже.</p>
  </Dialog>
}
export function LearningBar({ path, step, onStep, onPause, onComplete }: { path: LearningPath; step: number; onStep: (step: number) => void; onPause: () => void; onComplete: () => void }) {
  const current = path.steps[step]!
  return <section className="learning-bar" aria-label="Текущий учебный маршрут"><div className="learning-bar-top"><span><Sparkles size={15} />УЧЕБНЫЙ МАРШРУТ</span><button className="icon-button" onClick={onPause} aria-label="Приостановить маршрут"><Pause size={16} /></button></div><div className="learning-bar-content"><div><div className="tour-step-label">{path.title} · {step + 1} из {path.steps.length}</div><h3>{current.title}</h3><p>{current.explanation}</p></div><div className="tour-navigation"><button className="icon-button" onClick={() => onStep(step - 1)} disabled={step === 0} aria-label="Предыдущий этап"><ArrowLeft size={18} /></button><button className="button primary" onClick={() => step === path.steps.length - 1 ? onComplete() : onStep(step + 1)}>{step === path.steps.length - 1 ? 'Завершить' : 'Далее'}{step === path.steps.length - 1 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}</button></div></div><div className="tour-progress" aria-label="Этапы маршрута">{path.steps.map((item, i) => <button key={item.nodeId} className={i <= step ? 'visited' : ''} aria-label={`Этап ${i + 1}: ${item.title}`} aria-current={i === step ? 'step' : undefined} onClick={() => onStep(i)} />)}</div></section>
}

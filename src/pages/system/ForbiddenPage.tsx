import { Link } from '@tanstack/react-router'
import { ArrowLeft, ShieldX } from 'lucide-react'

export function ForbiddenPage() { return <main className="state-page"><span className="state-page__icon"><ShieldX size={30} /></span><p className="eyebrow">403 · AUTH-07</p><h1>Нет доступа к этой области</h1><p>Текущая роль или организационная область не разрешает просмотр. Данные объекта не раскрыты.</p><div><Link to="/home" className="button button--secondary button--md"><ArrowLeft size={16} /> На главную</Link><button className="button button--primary button--md">Запросить доступ</button></div></main> }

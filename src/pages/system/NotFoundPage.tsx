import { Link } from '@tanstack/react-router'
import { ArrowLeft, SearchX } from 'lucide-react'

export function NotFoundPage() { return <main className="state-page"><span className="state-page__icon"><SearchX size={30} /></span><p className="eyebrow">404</p><h1>Страница не найдена</h1><p>Ссылка устарела или адрес введён неверно. Вернитесь в базу геологических данных.</p><Link to="/geology/bgd" className="button button--primary button--md"><ArrowLeft size={16} /> В БГД</Link></main> }

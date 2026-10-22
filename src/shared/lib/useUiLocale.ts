import { useSyncExternalStore } from 'react'

export type UiLocale = 'ru' | 'kk' | 'en'
const key = 'kapgeo.ui.locale'
const event = 'kapgeo:locale'
function read(): UiLocale { try { const value = localStorage.getItem(key); return value === 'kk' || value === 'en' ? value : 'ru' } catch { return 'ru' } }
function subscribe(listener: () => void) { window.addEventListener(event, listener); window.addEventListener('storage', listener); return () => { window.removeEventListener(event, listener); window.removeEventListener('storage', listener) } }
export function setUiLocale(locale: UiLocale) { try { localStorage.setItem(key, locale) } catch { /* The current document still changes language. */ }; document.documentElement.lang = locale; window.dispatchEvent(new Event(event)) }
export function useUiLocale() { return useSyncExternalStore(subscribe, read, () => 'ru' as UiLocale) }

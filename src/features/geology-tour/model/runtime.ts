import type { GeologyTourDefinition, GeologyTourStep } from './types'

const runtimeTargetAttribute = 'data-geology-tour-runtime'

function isVisible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
}

export function resolveTourTarget(step: GeologyTourStep): HTMLElement | null {
  const candidates = [...document.querySelectorAll(step.target.selector)].filter(isVisible)
  if (!step.target.text) return candidates[0] ?? null
  const needle = step.target.text.toLocaleLowerCase('ru')
  return candidates.find((element) => element.textContent?.toLocaleLowerCase('ru').includes(needle)) ?? null
}

export function clearRuntimeTargets() {
  document.querySelectorAll(`[${runtimeTargetAttribute}]`).forEach((element) => element.removeAttribute(runtimeTargetAttribute))
}

function runtimeTitle(element: HTMLElement, index: number) {
  const heading = element.querySelector('h1, h2, h3, .panel__title, strong')?.textContent?.trim()
  if (heading) return heading
  return index === 0 ? 'Обзор страницы' : `Рабочая область ${index + 1}`
}

export function buildCurrentGeologyPageTour(route: string): GeologyTourDefinition | null {
  clearRuntimeTargets()
  const root = document.querySelector('#main-content')
  if (!root) return null
  const candidates = [
    root.querySelector('.page-header, .object-header, .compare-header, .wizard-header'),
    root.querySelector('.object-tabs'),
    ...root.querySelectorAll('.panel'),
    ...root.querySelectorAll('.workspace-savebar'),
  ].filter((element, index, items): element is HTMLElement => Boolean(element) && items.indexOf(element) === index && isVisible(element!)).slice(0, 16)
  if (!candidates.length) return null
  const steps = candidates.map((element, index) => {
    const id = `runtime-${index}`
    element.setAttribute(runtimeTargetAttribute, id)
    const title = runtimeTitle(element, index)
    const detail = element.querySelector('.page-header__description, .panel__description, p, small')?.textContent?.trim()
    return {
      id: `current-page-${index}`,
      route,
      target: { selector: `[${runtimeTargetAttribute}="${id}"]` },
      eyebrow: 'Экскурсия по текущей странице',
      title,
      description: detail || 'Изучите данные, статусы и доступные действия этой рабочей области.',
      hint: index === 0 ? 'Далее экскурсия последовательно подсветит все видимые панели страницы.' : undefined,
    } satisfies GeologyTourStep
  })
  return {
    id: 'geology-current-page',
    title: 'Текущая страница',
    description: 'Автоматический обзор всех видимых рабочих областей, включая новые панели.',
    estimatedMinutes: Math.max(2, Math.ceil(steps.length / 2)),
    steps,
  }
}

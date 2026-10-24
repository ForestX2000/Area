import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { describeRoute, detectSource, track } from '../utils/analytics'

const CLICKABLE = 'button, a[href], [role="button"], [role="switch"]'

// Название кнопки для статистики: явная метка, затем подпись для экранных дикторов, затем текст.
function buttonLabel(element: Element): string {
  const label = element.getAttribute('data-track') || element.getAttribute('aria-label') || element.textContent || ''
  return label.replace(/\s+/g, ' ').trim().slice(0, 60)
}

/** Записывает посещения страниц и нажатия кнопок вошедшего пользователя. */
export default function AnalyticsTracker() {
  const location = useLocation()
  const { user } = useAuth()
  const userId = user?.id
  const firstLoad = useRef(true)

  useEffect(() => {
    if (!userId) return
    const route = describeRoute(location.pathname, location.search)
    const state = location.state as { source?: unknown } | null
    if (route) track({ type: 'view', ...route, source: detectSource(state?.source, location.search, firstLoad.current) })
    firstLoad.current = false
  }, [location.pathname, location.search, location.state, userId])

  useEffect(() => {
    if (!userId) return
    function handleClick(event: MouseEvent) {
      const element = event.target instanceof Element ? event.target.closest(CLICKABLE) : null
      if (!element || element.closest('[data-track-ignore]')) return
      const target = buttonLabel(element)
      const route = describeRoute(window.location.pathname, window.location.search)
      if (!target || !route) return
      const projectId = element.closest('[data-track-project]')?.getAttribute('data-track-project') ?? route.projectId
      track({ type: 'click', page: route.page, projectId, mode: route.mode, source: 'in-app', target })
    }
    // Фаза перехвата: клик записывается, даже если обработчик кнопки остановит всплытие.
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [userId])

  return null
}

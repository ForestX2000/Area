import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { describeRoute, detectSource, track } from '../utils/analytics'

/** Записывает посещения страниц вошедшего пользователя. */
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

  return null
}

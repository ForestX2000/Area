import { useCallback, useState } from 'react'
import type { RouteRequest } from './routing'

// Редактор и просмотр пересоздаются при смене этажа; маршрут переживает это в рамках вкладки.
const key = (projectId: string) => `space-map-route:${projectId}`

function readRoute(projectId: string): RouteRequest {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(projectId)) ?? '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

export function useRouteRequest(projectId: string) {
  const [request, setRequest] = useState<RouteRequest>(() => readRoute(projectId))
  const update = useCallback((next: RouteRequest) => {
    setRequest(next)
    try { sessionStorage.setItem(key(projectId), JSON.stringify(next)) } catch { /* маршрут останется в памяти */ }
  }, [projectId])
  return [request, update] as const
}

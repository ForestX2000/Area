import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// Тот же ключ читает скрипт в index.html до первой отрисовки, чтобы не было вспышки светлой темы.
const STORAGE_KEY = 'space-map-theme'
const CHANGE_EVENT = 'space-map:theme-changed'
const THEME_COLORS: Record<Theme, string> = { light: '#DD2538', dark: '#121313' }

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Без доступа к хранилищу следуем системной теме.
  }
  return systemTheme()
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

export function setTheme(theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* Тема действует до перезагрузки. */ }
  applyTheme(theme)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void) {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onSystemChange = () => { applyTheme(getTheme()); callback() }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onSystemChange)
  media?.addEventListener('change', onSystemChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onSystemChange)
    media?.removeEventListener('change', onSystemChange)
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}


const STORAGE_KEY = 'space-map-auth'

export interface User {
  id: string
  name: string
  email: string
}

export interface AuthData {
  token: string
  user: User
}

export function getAuth(): AuthData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    return JSON.parse(saved) as AuthData
  } catch {
    return null
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function login(email: string, password: string): {
  ok: boolean
  error?: string
  user?: User
} {
  if (!validateEmail(email)) {
    return { ok: false, error: 'Укажи корректный email' }
  }
  if (!password || password.length < 6) {
    return {
      ok: false,
      error: 'Пароль должен быть не короче 6 символов',
    }
  }

  const user: User = {
    id: 'u-' + crypto.randomUUID(),
    name: email.split('@')[0],
    email,
  }
  const token = 'mock-token-' + crypto.randomUUID()
  setAuth(token, user)
  return { ok: true, user }
}

export function register(
  name: string,
  email: string,
  password: string,
): { ok: boolean; error?: string; user?: User } {
  if (!name.trim()) {
    return { ok: false, error: 'Введи имя' }
  }
  if (!validateEmail(email)) {
    return { ok: false, error: 'Укажи корректный email' }
  }
  if (!password || password.length < 6) {
    return {
      ok: false,
      error: 'Пароль должен быть не короче 6 символов',
    }
  }

  const user: User = {
    id: 'u-' + crypto.randomUUID(),
    name: name.trim(),
    email,
  }
  const token = 'mock-token-' + crypto.randomUUID()
  setAuth(token, user)
  return { ok: true, user }
}

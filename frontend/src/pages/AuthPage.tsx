
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { login, register, logout } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const result = await login(email, password)
        if (result.ok) {
          navigate('/')
        } else {
          setError(result.error || 'Не удалось войти')
        }
      } else {
        const result = await register(name, email, password)
        if (result.ok) {
          setSuccess('Аккаунт создан. Теперь можешь войти.')
          setMode('login')
          setName('')
          setEmail('')
          setPassword('')
        } else {
          setError(result.error || 'Не удалось создать аккаунт')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl mb-6">
          К
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {mode === 'login'
                ? 'Добро пожаловать назад. Введи свои данные.'
                : 'Присоединяйся, чтобы управлять своими проектами.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label
                  htmlFor="register-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Имя
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Иванов"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete={mode === 'login' ? 'email' : 'new-email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-slate-700"
              >
                Пароль
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 disabled:pointer-events-none"
            >
              {submitting ? 'Выполняется...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === 'login'
              ? 'Ещё нет аккаунта? '
              : 'Уже есть аккаунт? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
                setSuccess('')
              }}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline"
            >
              {mode === 'login' ? 'Создать аккаунт' : 'Войти'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Демонстрационная авторизация без реального бэкенда.
        </p>
      </div>
    </div>
  );
}

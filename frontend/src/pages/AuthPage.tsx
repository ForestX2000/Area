
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const ok = signIn(email, password)
      if (ok) {
        navigate('/')
      } else {
        setError('Неверный email или пароль')
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
            <h2 className="text-2xl font-bold text-slate-900">Вход в аккаунт</h2>
            <p className="mt-2 text-sm text-slate-600">
              Добро пожаловать назад. Введи свои данные.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="email"
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 disabled:pointer-events-none"
            >
              {submitting ? 'Выполняется...' : 'Войти'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Демонстрационная авторизация без реального бэкенда.
          </p>
        </div>
      </div>
    </div>
  );
}

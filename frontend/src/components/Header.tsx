
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <header className="header">
        <div>
          <h1 className="header-title">Карта пространства</h1>
          <p className="header-subtitle">
            Управление пространствами и проектами
          </p>
        </div>

        <div className="header-profile">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Войти
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="header">
      <div>
        <h1 className="header-title">Карта пространства</h1>
        <p className="header-subtitle">
          Управление пространствами и проектами
        </p>
      </div>

      <div className="header-profile flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-semibold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium text-slate-900">
            {user.name}
          </span>
          <Link
            to="/profile"
            className="mt-0.5 text-xs text-slate-500 hover:text-indigo-600"
          >
            Профиль
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Выйти
        </button>
      </div>
    </header>
  )
}

export default Header

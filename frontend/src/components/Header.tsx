
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Бренд */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm">
              К
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <Link
                to="/"
                className="text-xl font-bold text-slate-900 tracking-tight hover:text-indigo-600 transition"
              >
                Area
              </Link>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                MVP
              </span>
            </div>
          </div>

          {/* Навигация */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/"
              className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              ▦ Проекты
            </Link>
            <Link
              to="/projects/demo"
              className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              ⌖ Карта пространства
            </Link>
            <Link
              to="/profile"
              className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              👤 Профиль
            </Link>
          </nav>

          {/* Действия и пользователь */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/projects/new')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <span>+</span> Создать проект
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-900">
                    {user.name}
                  </span>
                  <Link
                    to="/profile"
                    className="text-xs text-slate-500 hover:text-indigo-600 transition"
                  >
                    Профиль
                  </Link>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-semibold text-sm shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="hidden sm:px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition"
                >
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
                >
                  Регистрация
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

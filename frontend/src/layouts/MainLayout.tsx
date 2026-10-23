
import { NavLink, Outlet } from 'react-router-dom'
import Header from '../components/Header'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="flex w-full flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-5">
        <NavLink to="/" className="flex items-center gap-3 px-2 py-3">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 font-bold text-white">
            К
          </span>
          <span className="font-bold text-slate-900">
            Карта пространства
          </span>
        </NavLink>

        <nav className="mt-5 flex gap-2 md:flex-col">
          <NavLink to="/" end className={navClass}>
            <span>▦</span>
            Мои проекты
          </NavLink>

          <NavLink
            to="/projects/demo"
            className={navClass}
          >
            <span>⌖</span>
            Карта пространства
          </NavLink>
        </nav>

        <div className="mt-5 hidden border-t border-slate-100 pt-4 text-xs text-slate-400 md:mt-auto md:block">
          Карта пространства · MVP
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Header />

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

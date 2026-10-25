
function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-line bg-surface text-body">
      <div className="flex items-center gap-3 border-b border-line px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
          ТТК
        </div>
        <span className="font-semibold text-body">
          Пространство
        </span>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-5">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Рабочая область
        </p>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg bg-brand-soft px-3 py-3 text-left text-sm font-semibold text-brand"
        >
          <span>▦</span>
          Мои проекты
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-body transition hover:bg-page hover:text-brand"
        >
          <span>⌖</span>
          Карта пространства
        </button>

        <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-muted">
          Настройки
        </p>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-body transition hover:bg-page hover:text-brand"
        >
          <span>⚙</span>
          Настройки
        </button>
      </nav>

      <div className="border-t border-line px-5 py-4 text-xs text-muted">
        Карта пространства · MVP
      </div>
    </aside>
  )
}

export default Sidebar

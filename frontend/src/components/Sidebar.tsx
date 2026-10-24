
function Sidebar() {
  return (
<<<<<<< Updated upstream
    <aside className="flex min-h-screen w-64 flex-col border-r border-[#E5E5E5] bg-white text-[#4A4A4A]">
      <div className="flex items-center gap-3 border-b border-[#E5E5E5] px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E23E1A] text-sm font-bold text-white">
          ТТК
        </div>
        <span className="font-semibold text-[#4A4A4A]">
=======
    <aside className="flex min-h-screen w-64 flex-col border-r border-line bg-surface text-body">
      <div className="flex items-center gap-3 border-b border-line px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
          ТТК
        </div>
        <span className="font-semibold text-body">
>>>>>>> Stashed changes
          Пространство
        </span>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-5">
<<<<<<< Updated upstream
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[#777777]">
=======
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
>>>>>>> Stashed changes
          Рабочая область
        </p>

        <button
          type="button"
<<<<<<< Updated upstream
          className="flex w-full items-center gap-3 rounded-lg bg-[#FCEBE7] px-3 py-3 text-left text-sm font-semibold text-[#E23E1A]"
=======
          className="flex w-full items-center gap-3 rounded-lg bg-brand-soft px-3 py-3 text-left text-sm font-semibold text-brand"
>>>>>>> Stashed changes
        >
          <span>▦</span>
          Мои проекты
        </button>

        <button
          type="button"
<<<<<<< Updated upstream
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#4A4A4A] transition hover:bg-[#F5F5F5] hover:text-[#E23E1A]"
=======
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-body transition hover:bg-page hover:text-brand"
>>>>>>> Stashed changes
        >
          <span>⌖</span>
          Карта пространства
        </button>

<<<<<<< Updated upstream
        <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-[#777777]">
=======
        <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-muted">
>>>>>>> Stashed changes
          Настройки
        </p>

        <button
          type="button"
<<<<<<< Updated upstream
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#4A4A4A] transition hover:bg-[#F5F5F5] hover:text-[#E23E1A]"
=======
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-body transition hover:bg-page hover:text-brand"
>>>>>>> Stashed changes
        >
          <span>⚙</span>
          Настройки
        </button>
      </nav>

<<<<<<< Updated upstream
      <div className="border-t border-[#E5E5E5] px-5 py-4 text-xs text-[#777777]">
=======
      <div className="border-t border-line px-5 py-4 text-xs text-muted">
>>>>>>> Stashed changes
        Карта пространства · MVP
      </div>
    </aside>
  )
}

export default Sidebar

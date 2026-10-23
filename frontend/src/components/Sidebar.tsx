
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">ТТК</div>
        <span>Пространство</span>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-label">РАБОЧАЯ ОБЛАСТЬ</p>

        <button className="nav-item active">
          <span>▦</span>
          Мои проекты
        </button>

        <button className="nav-item">
          <span>⌖</span>
          Карта пространства
        </button>

        <p className="nav-label">НАСТРОЙКИ</p>

        <button className="nav-item">
          <span>⚙</span>
          Настройки
        </button>
      </nav>

      <div className="sidebar-footer">
        Карта пространства · MVP
      </div>
    </aside>
  )
}

export default Sidebar

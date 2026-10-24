import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import BrandLogo from "./BrandLogo";


const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? "bg-brand-soft text-brand"
      : "text-body hover:bg-page hover:text-brand"
  }`;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }
  const location = useLocation();
  const isProjectsPage = location.pathname === "/";

  const pageTitle = isProjectsPage
    ? "Мои проекты"
    : location.pathname.startsWith("/workspace")
      ? "2D Workspace"
    : location.pathname === "/projects/new"
      ? "Создание проекта"
      : location.pathname.includes("/map")
        ? "Карта пространства"
        : location.pathname.includes("/editor") ? "Редактор чертежа" : "Проект";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-body transition hover:bg-brand-soft hover:text-brand"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <Link
            to="/"
            aria-label="ТТК карта пространств"
            onClick={() => setMenuOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <BrandLogo compact />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted">Рабочая область</p>
              <p className="text-sm font-medium text-body">{pageTitle}</p>
            </div>

            {isProjectsPage && (
              <>
              <button
                type="button"
                aria-label="Создать проект"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("space-map:toggle-project-form"),
                  )
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover sm:px-4"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Создать проект</span>
              </button>
                {user && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Выйти из аккаунта"
                    className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-body transition hover:border-brand-border hover:bg-brand-soft hover:text-brand"
                  >
                    <span className="hidden sm:inline">{user.name} · </span>
                    Выйти
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/20"
          />

          <nav
            id="main-navigation"
            aria-label="Главная навигация"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,85vw)] flex-col border-r border-line bg-white p-5 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between border-b border-line pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  ТТК карта пространств
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Закрыть меню"
                className="rounded-lg px-3 py-2 text-xl text-muted hover:bg-page hover:text-brand"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <NavLink
                to="/"
                end
                onClick={() => setMenuOpen(false)}
                className={navClass}
              >
                <span aria-hidden="true">▦</span>
                Мои проекты
              </NavLink>

              <NavLink
                to="/workspace"
                onClick={() => setMenuOpen(false)}
                className={navClass}
              >
                <span aria-hidden="true">▧</span>
                2D Workspace
              </NavLink>

              <NavLink
                to="/projects/new"
                onClick={() => setMenuOpen(false)}
                className={navClass}
              >
                <span aria-hidden="true">＋</span>
                Создать проект
              </NavLink>
            </div>
          </nav>
        </>
      )}
    </>
  );
}

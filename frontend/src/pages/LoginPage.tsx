
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { DEMO_USER, DEMO_PASSWORD } from "../utils/auth";
import { useAuth } from "../contexts/useAuth";

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (
    location.state as { from?: { pathname?: string } } | null
  )?.from?.pathname;

  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to={from || "/"} replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!signIn(email, password)) {
      setError("Неверный email или пароль. Проверь данные и попробуй ещё раз.");
      return;
    }

    navigate(from || "/", { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E23E1A] text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path d="M3 6.5 9 3l6 3 6-3v14.5L15 21l-6-3-6 3V6.5Z" />
              <path d="M9 3v15M15 6v15" />
            </svg>
          </div>

          <div>
            <p className="font-bold text-[#4A4A4A]">ТТК карта пространств</p>
            <p className="mt-1 text-sm text-[#777777]">
              Интерактивные карты помещений
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#4A4A4A]">
          Вход в систему
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#777777]">
          Войди, чтобы управлять проектами и интерактивными картами.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-[#D9D9D9] px-4 py-3 text-sm text-[#4A4A4A] outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:ring-4 focus:ring-[#FCEBE7]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
              Пароль
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введи пароль"
              className="w-full rounded-lg border border-[#D9D9D9] px-4 py-3 text-sm text-[#4A4A4A] outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:ring-4 focus:ring-[#FCEBE7]"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-[#F2B8AA] bg-[#FCEBE7] p-3 text-sm text-[#A52C13]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus:outline-none focus:ring-4 focus:ring-[#FCEBE7]"
          >
            Войти
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#777777]">
            Демо-доступ
          </p>
          <p className="mt-3 text-sm text-[#4A4A4A]">
            Email: <span className="font-medium">{DEMO_USER.email}</span>
          </p>
          <p className="mt-1 text-sm text-[#4A4A4A]">
            Пароль: <span className="font-medium">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </section>
    </main>
  );
}

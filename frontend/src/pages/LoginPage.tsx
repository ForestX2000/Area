
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { DEMO_USER, DEMO_PASSWORD } from "../utils/auth";
import { useAuth } from "../contexts/useAuth";
import BrandLogo from "../components/BrandLogo";

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
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo />
        </div>

        <h1 className="text-2xl font-bold text-body">
          Вход в систему
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Войди, чтобы управлять проектами и интерактивными картами.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-body">
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-line-strong px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-body">
              Пароль
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введи пароль"
              className="w-full rounded-lg border border-line-strong px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-brand-border bg-brand-soft p-3 text-sm text-brand-strong"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft"
          >
            Войти
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-line bg-page p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Демо-доступ
          </p>
          <p className="mt-3 text-sm text-body">
            Email: <span className="font-medium">{DEMO_USER.email}</span>
          </p>
          <p className="mt-1 text-sm text-body">
            Пароль: <span className="font-medium">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </section>
    </main>
  );
}

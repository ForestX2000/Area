
import { useId, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthError, DEMO_PASSWORD, DEMO_USER, DEMO_VIEWER, DEMO_VIEWER_PASSWORD, validatePassword } from "../utils/auth";
import { useAuth } from "../contexts/useAuth";
import BrandLogo from "../components/BrandLogo";
import ThemeToggle from "../components/ThemeToggle";

type Mode = "login" | "register";

const inputClass = "w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft";

const DEMO_ACCOUNTS = [
  { title: "Администратор", hint: "проекты, редактор, статистика", email: DEMO_USER.email, password: DEMO_PASSWORD },
  { title: "Пользователь", hint: "просмотр объектов в 2D и 3D", email: DEMO_VIEWER.email, password: DEMO_VIEWER_PASSWORD },
];

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (
    location.state as { from?: { pathname?: string; search?: string } } | null
  )?.from;
  const redirect = from?.pathname ? `${from.pathname}${from.search ?? ""}` : "/";

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const passwordId = useId();

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
    setRepeat("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "login") {
      if (!signIn(email, password)) {
        setError("Неверный email или пароль. Проверьте данные и попробуйте ещё раз.");
        return;
      }
    } else {
      if (password !== repeat) {
        setError("Пароли не совпадают.");
        return;
      }
      try {
        signUp(name, email, password);
      } catch (reason) {
        setError(reason instanceof AuthError ? reason.message : "Не удалось зарегистрироваться. Проверьте доступное место в браузере.");
        return;
      }
    }

    navigate(redirect, { replace: true });
  }

  const passwordHint = mode === "register" && password ? validatePassword(password) : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo />
        </div>

        <div role="tablist" aria-label="Вход или регистрация" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1">
          {([["login", "Вход"], ["register", "Регистрация"]] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => switchMode(value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === value ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-body"}`}>
              {label}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-ink">
          {mode === "login" ? "Вход в систему" : "Создание аккаунта"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "login"
            ? "Войдите, чтобы открыть объекты и интерактивные карты."
            : "После регистрации вы сможете просматривать объекты в 2D и на панорамах 360°."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {mode === "register" && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-body">Имя</span>
              <input autoComplete="name" required value={name} maxLength={80} onChange={(event) => setName(event.target.value)}
                placeholder="Как к вам обращаться" className={inputClass} />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-body">Email</span>
            <input type="email" autoComplete={mode === "login" ? "username" : "email"} required value={email}
              onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className={inputClass} />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor={passwordId} className="text-sm font-semibold text-body">Пароль</label>
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}
                aria-label="Показать пароль" className="!text-xs font-medium text-muted hover:text-brand">
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
            <input id={passwordId} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required
              value={password} onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "login" ? "Введите пароль" : "Не короче 8 символов, буквы и цифры"} className={inputClass} />
            {passwordHint && <span className="mt-2 block text-xs text-muted">{passwordHint}</span>}
          </div>

          {mode === "register" && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-body">Повторите пароль</span>
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={repeat}
                onChange={(event) => setRepeat(event.target.value)} className={inputClass} />
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-brand-border bg-brand-soft p-3 text-sm text-brand-strong">
              {error}
            </p>
          )}

          <button type="submit"
            className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-soft">
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        {mode === "login" && (
          <div className="mt-6 rounded-lg border border-line bg-page p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Демо-доступ</p>
            <ul className="mt-3 space-y-3">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold text-body">{account.title}</span>
                    <span className="block truncate text-xs text-muted">{account.email} · {account.password}</span>
                    <span className="block text-xs text-muted">{account.hint}</span>
                  </span>
                  <button type="button" aria-label={`Подставить вход: ${account.title}`}
                    onClick={() => { setEmail(account.email); setPassword(account.password); setError(""); }}
                    className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-brand-border hover:bg-brand-soft hover:text-brand">
                    Подставить
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}


<<<<<<< Updated upstream
=======
import { sha256 } from "./sha256";

export type UserRole = "admin" | "user";

>>>>>>> Stashed changes
export interface DemoUser {
  id: string;
  name: string;
  email: string;
<<<<<<< Updated upstream
  role: string;
}

const AUTH_STORAGE_KEY = "space-map-demo-user";
=======
  role: UserRole | string;
  avatar?: string;
}

interface Account extends DemoUser {
  salt: string;
  // Пустой хэш — аккаунт создан из старой сессии, пароль ещё не задан.
  passwordHash: string;
  createdAt: string;
}

// Сессия хранится под прежним ключом, чтобы старые входы и тесты оставались валидными.
const AUTH_STORAGE_KEY = "space-map-demo-user";
const ACCOUNTS_STORAGE_KEY = "space-map-accounts";
const HASH_ROUNDS = 1000;
>>>>>>> Stashed changes

export const DEMO_USER: DemoUser = {
  id: "demo-user-1",
  name: "Иван",
  email: "demo@spacemap.ru",
  role: "admin",
};

export const DEMO_PASSWORD = "SpaceMap123!";

<<<<<<< Updated upstream
=======
export const DEMO_VIEWER: DemoUser = {
  id: "demo-viewer-1",
  name: "Мария",
  email: "user@spacemap.ru",
  role: "user",
};

export const DEMO_VIEWER_PASSWORD = "Viewer123!";

export class AuthError extends Error {}

export function isAdmin(user: DemoUser | null | undefined): boolean {
  return user?.role === "admin";
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Демо без сервера: хэш с солью и повторами не даёт прочитать пароль из localStorage.
function hashPassword(password: string, salt: string): string {
  let hash = sha256(`${salt}:${password}`);
  for (let round = 1; round < HASH_ROUNDS; round++) hash = sha256(hash + salt);
  return hash;
}

function createAccount(user: DemoUser, password: string): Account {
  const salt = randomSalt();
  return { ...user, salt, passwordHash: hashPassword(password, salt), createdAt: new Date().toISOString() };
}

function publicUser({ id, name, email, role, avatar }: Account | DemoUser): DemoUser {
  return avatar ? { id, name, email, role, avatar } : { id, name, email, role };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAccounts(): Account[] {
  let accounts: Account[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY) ?? "[]");
    if (Array.isArray(parsed)) accounts = parsed as Account[];
  } catch {
    accounts = [];
  }
  const missing = [[DEMO_USER, DEMO_PASSWORD], [DEMO_VIEWER, DEMO_VIEWER_PASSWORD]] as const;
  const seeded = missing.filter(([user]) => !accounts.some((account) => account.email === user.email));
  if (seeded.length === 0) return accounts;
  accounts = [...accounts, ...seeded.map(([user, password]) => createAccount(user, password))];
  saveAccounts(accounts);
  return accounts;
}

function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function saveSession(user: DemoUser): DemoUser {
  const session = publicUser(user);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

// Сессия без аккаунта (вход до появления регистрации) получает аккаунт при первом изменении профиля.
function findAccount(accounts: Account[], userId: string): Account {
  const account = accounts.find((item) => item.id === userId);
  if (account) return account;
  const session = getCurrentUser();
  if (!session || session.id !== userId) throw new AuthError("Аккаунт не найден. Войдите заново.");
  const created: Account = { ...session, salt: randomSalt(), passwordHash: "", createdAt: new Date().toISOString() };
  accounts.push(created);
  return created;
}

function updateAccount(userId: string, change: (account: Account, accounts: Account[]) => Account): DemoUser {
  const accounts = readAccounts();
  const account = findAccount(accounts, userId);
  const updated = change(account, accounts);
  saveAccounts(accounts.map((item) => (item.id === userId ? updated : item)));
  return saveSession(updated);
}

function checkPassword(account: Account, password: string): boolean {
  return account.passwordHash !== "" && hashPassword(password, account.salt) === account.passwordHash;
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : "Введите корректный email.";
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Пароль должен быть не короче 8 символов.";
  if (!/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password)) return "Пароль должен содержать буквы и цифры.";
  return null;
}

>>>>>>> Stashed changes
export function getCurrentUser(): DemoUser | null {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!saved) return null;

    const user: unknown = JSON.parse(saved);

    if (
      typeof user !== "object" ||
      user === null ||
      !("id" in user) ||
      !("name" in user) ||
      !("email" in user) ||
      !("role" in user)
    ) {
      return null;
    }

    return user as DemoUser;
  } catch {
    return null;
  }
}

<<<<<<< Updated upstream
export function login(email: string, password: string): DemoUser | null {
  if (
    email.trim().toLowerCase() !== DEMO_USER.email ||
    password !== DEMO_PASSWORD
  ) {
    return null;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEMO_USER));

  return DEMO_USER;
=======
export function getAccountCreatedAt(userId: string): string | null {
  return readAccounts().find((account) => account.id === userId)?.createdAt ?? null;
}

export function getAccountNames(): Record<string, string> {
  return Object.fromEntries(readAccounts().map((account) => [account.id, account.name]));
}

export function login(email: string, password: string): DemoUser | null {
  const account = readAccounts().find((item) => item.email === normalizeEmail(email));
  if (!account || !checkPassword(account, password)) return null;
  return saveSession(account);
}

export function register(name: string, email: string, password: string): DemoUser {
  const accounts = readAccounts();
  const normalized = normalizeEmail(email);
  if (!name.trim()) throw new AuthError("Введите имя.");
  const emailError = validateEmail(normalized);
  if (emailError) throw new AuthError(emailError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new AuthError(passwordError);
  if (accounts.some((account) => account.email === normalized)) throw new AuthError("Пользователь с таким email уже зарегистрирован.");

  // Самостоятельная регистрация создаёт обычного пользователя; администраторы задаются отдельно.
  const account = createAccount({ id: crypto.getRandomValues(new Uint32Array(4)).join("-"), name: name.trim(), email: normalized, role: "user" }, password);
  saveAccounts([...accounts, account]);
  return saveSession(account);
}

export function updateName(userId: string, name: string): DemoUser {
  if (!name.trim()) throw new AuthError("Введите имя.");
  return updateAccount(userId, (account) => ({ ...account, name: name.trim().slice(0, 80) }));
}

export function updateAvatar(userId: string, avatar: string | undefined): DemoUser {
  return updateAccount(userId, (account) => {
    const next = { ...account, avatar };
    if (!avatar) delete next.avatar;
    return next;
  });
}

export function changeEmail(userId: string, email: string, currentPassword: string): DemoUser {
  const normalized = normalizeEmail(email);
  const emailError = validateEmail(normalized);
  if (emailError) throw new AuthError(emailError);
  return updateAccount(userId, (account, accounts) => {
    if (account.passwordHash && !checkPassword(account, currentPassword)) throw new AuthError("Неверный текущий пароль.");
    if (accounts.some((item) => item.id !== userId && item.email === normalized)) throw new AuthError("Этот email уже занят другим пользователем.");
    return { ...account, email: normalized };
  });
}

export function changePassword(userId: string, currentPassword: string, nextPassword: string): void {
  const passwordError = validatePassword(nextPassword);
  if (passwordError) throw new AuthError(passwordError);
  updateAccount(userId, (account) => {
    if (account.passwordHash && !checkPassword(account, currentPassword)) throw new AuthError("Неверный текущий пароль.");
    const salt = randomSalt();
    return { ...account, salt, passwordHash: hashPassword(nextPassword, salt) };
  });
>>>>>>> Stashed changes
}

export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

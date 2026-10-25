import { createContext } from "react";
import type { DemoUser } from "../utils/auth";

export interface AuthContextValue {
  user: DemoUser | null;
  /** Пользователь сам вышел: страницу прошлой сессии не нужно открывать после следующего входа. */
  signedOut: boolean;
  signIn: (email: string, password: string) => boolean;
  signUp: (name: string, email: string, password: string) => DemoUser;
  signOut: () => void;
  /** Применяет изменение профиля и обновляет текущего пользователя (имя, почта, аватар). */
  updateUser: (change: (user: DemoUser) => DemoUser) => DemoUser;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

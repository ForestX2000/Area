import { createContext } from "react";
import type { DemoUser } from "../utils/auth";

export interface AuthContextValue {
  user: DemoUser | null;
  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
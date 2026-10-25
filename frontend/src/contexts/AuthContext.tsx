
import { useState, type ReactNode } from "react";
import {
  AuthError,
  getCurrentUser,
  login as loginDemoUser,
  logout as logoutDemoUser,
  register,
  type DemoUser,
} from "../utils/auth";
import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() =>
    getCurrentUser()
  );
  const [signedOut, setSignedOut] = useState(false);

  function signIn(email: string, password: string): boolean {
    const loggedInUser = loginDemoUser(email, password);

    if (!loggedInUser) {
      return false;
    }

    setUser(loggedInUser);
    setSignedOut(false);
    return true;
  }

  function signUp(name: string, email: string, password: string): DemoUser {
    const registered = register(name, email, password);
    setUser(registered);
    setSignedOut(false);
    return registered;
  }

  function signOut() {
    logoutDemoUser();
    setUser(null);
    setSignedOut(true);
  }

  function updateUser(change: (user: DemoUser) => DemoUser): DemoUser {
    if (!user) throw new AuthError("Войдите в аккаунт.");
    const updated = change(user);
    setUser(updated);
    return updated;
  }

  return (
    <AuthContext.Provider value={{ user, signedOut, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

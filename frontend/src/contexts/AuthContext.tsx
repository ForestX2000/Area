
import { useState, type ReactNode } from "react";
import {
  getCurrentUser,
  login as loginDemoUser,
  logout as logoutDemoUser,
  type DemoUser,
} from "../utils/auth";
import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() =>
    getCurrentUser()
  );

  function signIn(email: string, password: string): boolean {
    const loggedInUser = loginDemoUser(email, password);

    if (!loggedInUser) {
      return false;
    }

    setUser(loggedInUser);
    return true;
  }

  function signOut() {
    logoutDemoUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

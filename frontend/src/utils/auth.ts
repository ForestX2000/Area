
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const AUTH_STORAGE_KEY = "space-map-demo-user";

export const DEMO_USER: DemoUser = {
  id: "demo-user-1",
  name: "Иван",
  email: "demo@spacemap.ru",
  role: "admin",
};

export const DEMO_PASSWORD = "SpaceMap123!";

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

export function login(email: string, password: string): DemoUser | null {
  if (
    email.trim().toLowerCase() !== DEMO_USER.email ||
    password !== DEMO_PASSWORD
  ) {
    return null;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEMO_USER));

  return DEMO_USER;
}

export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../api/axios";

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "employee";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCurrentUser() {
    // The session lives in an httpOnly cookie we can't read from JS, so we
    // can't check "is there a token" locally anymore -- just ask the
    // server. A 401 here just means "not logged in", which is fine.
    try {
      const { data } = await api.get<AuthUser>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    // Backend expects OAuth2PasswordRequestForm -> form-urlencoded body
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    // The response sets the httpOnly session cookie; we don't need (or
    // want) to read a token out of the body ourselves.
    await api.post(
      "/auth/login",
      form,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { data: me } = await api.get<AuthUser>("/auth/me");
    setUser(me);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout, still clear local session
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
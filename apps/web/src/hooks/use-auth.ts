import { create } from "zustand";
import { persist } from "zustand/middleware";

export const IS_AUTH_DISABLED = String(import.meta.env.VITE_DISABLE_AUTH).toLowerCase() === "true";



export interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token: token || null });
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);

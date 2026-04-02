/**
 * @file hooks/use-auth.ts
 * @description Hook to manage authentication state and user profile
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  setAuth: (user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user) => {
        set({ user });
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        set({ user: null });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);

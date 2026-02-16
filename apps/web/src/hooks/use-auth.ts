/**
 * @file hooks/use-auth.ts
 * @description Hook to manage authentication state and user profile
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCookie, deleteCookie } from "cookies-next";

export interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: string | null;
  roles?: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        // Set cookie for HTTP requests (middleware/server actions)
        try {
          setCookie("auth-token", token, {
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
        } catch (e) {
          console.error("useAuth: setCookie failed", e);
        }
        set({ token, user });
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        deleteCookie("auth-token");
        set({ token: null, user: null });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);

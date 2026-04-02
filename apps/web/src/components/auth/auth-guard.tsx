"use client";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isAuthPage = location.pathname.startsWith("/auth");

    if (!user && !isAuthPage) {
      // Nếu chưa login và không phải trang auth -> Về login
      navigate("/auth/login", { replace: true });
    } else if (user && isAuthPage) {
      // Nếu đã login mà vào trang auth -> Về dashboard
      navigate("/", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Optionally show nothing while redirecting to prevent screen flicker
  // But for now, we just return children as the effect will handle the redirect
  return <>{children}</>;
}

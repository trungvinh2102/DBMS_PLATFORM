"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAuthPage = pathname.startsWith("/auth");

    if (!token && !isAuthPage) {
      // Nếu chưa login và không phải trang auth -> Về login
      router.replace("/auth/login");
    } else if (token && isAuthPage) {
      // Nếu đã login mà vào trang auth -> Về dashboard
      router.replace("/");
    }
  }, [token, pathname, router]);

  // Optionally show nothing while redirecting to prevent screen flicker
  // But for now, we just return children as the effect will handle the redirect
  return <>{children}</>;
}

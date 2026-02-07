/**
 * @file components/auth/protected-route.tsx
 * @description Wrapper component to protect routes based on authentication and RBAC
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // If empty, just requires login
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 1. Check if user is logged in
    if (!token || !user) {
      router.push("/auth/login" as any);
      return;
    }

    // 2. Check Role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        router.push("/unauthorized" as any); // Or dashboard
      }
    }
  }, [user, token, router, allowedRoles]);

  // While checking (or if unauthorized), you might want to show a spinner or nothing
  // Ideally, valid state renders quickly.
  if (!token || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

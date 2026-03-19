/**
 * @file components/auth/protected-route.tsx
 * @description Wrapper component to protect routes based on authentication and RBAC
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if user is logged in
    if (!token || !user) {
      navigate("/auth/login", { replace: true });
      return;
    }

    // 2. Check Role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        navigate("/unauthorized", { replace: true }); // Or dashboard
      }
    }
  }, [user, token, navigate, allowedRoles]);

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

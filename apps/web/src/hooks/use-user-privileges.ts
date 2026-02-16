"use client";

import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

export interface UserPrivileges {
  hasPrivilege: (code: string) => boolean;
  isLoading: boolean;
  privileges: any[];
  refetch: () => void;
}

export function useUserPrivileges(): UserPrivileges {
  const { user } = useAuth();

  const {
    data: privileges = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["user-privileges", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await userApi.getMyPrivileges();
      } catch (err) {
        console.error("Failed to fetch user privileges", err);
        return []; // Fallback to empty on error
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });

  const hasPrivilege = (code: string) => {
    // Admin always has access
    if (user?.role === "Admin") return true;

    return (
      Array.isArray(privileges) &&
      privileges.some((p) => p.privilegeCode === code)
    );
  };

  return { hasPrivilege, isLoading, privileges, refetch };
}

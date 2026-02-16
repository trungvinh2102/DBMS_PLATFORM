"use client";

import { useUserPrivileges } from "@/hooks/use-user-privileges";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface PrivilegeGuardProps {
  children: React.ReactNode;
  privilege: string;
  fallback?: React.ReactNode;
}

export function PrivilegeGuard({
  children,
  privilege,
  fallback,
}: PrivilegeGuardProps) {
  const { hasPrivilege, isLoading } = useUserPrivileges();
  const hasAccess = hasPrivilege(privilege);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-background p-4">
      <Card className="max-w-md w-full border-destructive/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          This section requires the{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-xs">
            {privilege}
          </code>{" "}
          privilege. Please contact your system administrator if you believe
          this is an error.
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * @file app/unauthorized/page.tsx
 * @description Page displayed when user lacks permission
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-neutral-950 text-white space-y-6">
      <div className="rounded-full bg-red-500/10 p-6 ring-1 ring-red-500/20">
        <ShieldAlert className="h-16 w-16 text-red-500" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-neutral-400 max-w-md mx-auto">
          You do not have permission to view this page. Please contact your
          administrator if you believe this is an error.
        </p>
      </div>

      <Button
        asChild
        variant="outline"
        className="border-neutral-800 hover:bg-neutral-900 text-white"
      >
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}

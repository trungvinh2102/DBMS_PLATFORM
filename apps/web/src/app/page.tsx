/**
 * @file apps/web/src/app/page.tsx
 * @description Main dashboard home page for the authenticated user.
 * Displays system status, metrics, quick actions, and recent activity.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default function Home() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full px-6 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your databases, execute queries, and monitor system health.
        </p>
      </div>

      {/* Dashboard Content */}
      <DashboardStats />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
        <QuickActions />
        <RecentActivity />
      </div>
    </div>
  );
}

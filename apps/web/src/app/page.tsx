/**
 * @file apps/web/src/app/page.tsx
 * @description Main dashboard home page for the authenticated user.
 * Displays system status, metrics, quick actions, and recent activity.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

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

      {/* Navigation / Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link href="/auth/login">
          <Button size="lg" className="rounded-xl px-8 bg-white text-black hover:bg-neutral-200 font-semibold group shadow-xl">
            Go to Admin Panal
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <a href="https://github.com/trungvinh2102/DBMS_PLATFORM/releases/download/0.1.0/DBMS_Platform.exe" target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline" className="rounded-xl px-8 border-white/10 hover:bg-white/5 bg-white/5 backdrop-blur-sm text-white font-semibold shadow-xl">
            <Download className="mr-2 h-4 w-4" />
            Download Desktop App (.exe)
          </Button>
        </a>
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

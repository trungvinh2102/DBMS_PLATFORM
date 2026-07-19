/**
 * @file apps/web/src/app/page.tsx
 * @description The main Home dashboard featuring a premium Async Bento Grid layout.
 */

"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { HeroAI } from "@/components/dashboard/hero-ai";
import { ConnectionOverview } from "@/components/dashboard/connection-overview";
import { HealthMonitor } from "@/components/dashboard/health-monitor";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SavedQueries } from "@/components/dashboard/saved-queries";
import { DataAnalytics } from "@/components/dashboard/data-analytics";
import { useAuth } from "@/hooks/use-auth";

function ProgressiveMount({ delay, children }: { delay: number; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return show ? <>{children}</> : null;
}

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden bg-background">
      <div className="p-4 md:p-6 lg:p-8 relative min-h-full">
        {/* Subtle background ambient glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />

        <div className="mx-auto max-w-7xl max-xl:max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-min">
            {/* Row 1: Hero (Span 4) - mounts immediately */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0 }}
              className="col-span-1 md:col-span-4"
            >
              <HeroAI />
            </motion.div>

            {/* Row 2: Analytics Dashboard (Span 4) - mounts after 80ms */}
            <ProgressiveMount delay={80}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="col-span-1 md:col-span-4"
              >
                <DataAnalytics />
              </motion.div>
            </ProgressiveMount>

            {/* Row 3: Connection Overview (Span 2) + Quick Actions (Span 1x2) - mounts after 160ms */}
            <ProgressiveMount delay={160}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="col-span-1 md:col-span-2 relative z-10"
              >
                <ConnectionOverview />
              </motion.div>
            </ProgressiveMount>

            <ProgressiveMount delay={200}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="col-span-1 relative z-10"
              >
                <HealthMonitor />
              </motion.div>
            </ProgressiveMount>

            <ProgressiveMount delay={240}>
              <motion.div className="col-span-1 grid grid-rows-2 gap-6 relative z-10">
                <QuickActions />
              </motion.div>
            </ProgressiveMount>

            {/* Row 4: Recent Activity (Span 3) + Saved Queries (Span 1) - mounts after 320ms */}
            <ProgressiveMount delay={320}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="col-span-1 md:col-span-3 relative z-10"
              >
                <RecentActivity />
              </motion.div>
            </ProgressiveMount>

            <ProgressiveMount delay={360}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="col-span-1 relative z-10"
              >
                <SavedQueries />
              </motion.div>
            </ProgressiveMount>
          </div>
        </div>
      </div>
    </div>
  );
}

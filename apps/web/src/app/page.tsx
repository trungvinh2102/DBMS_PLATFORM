/**
 * @file apps/web/src/app/page.tsx
 * @description The main Home dashboard featuring a premium Async Bento Grid layout.
 */

"use client";

import { motion } from "motion/react";
import { HeroAI } from "@/components/dashboard/hero-ai";
import { ConnectionOverview } from "@/components/dashboard/connection-overview";
import { HealthMonitor } from "@/components/dashboard/health-monitor";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SavedQueries } from "@/components/dashboard/saved-queries";
import { DataAnalytics } from "@/components/dashboard/data-analytics";
import { useAuth } from "@/hooks/use-auth";

// Animation variant for staggering the Bento pieces
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      ease: "easeOut" as any
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
};

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden bg-background">
      <div className="p-4 md:p-6 lg:p-8 relative min-h-full">
        {/* Subtle background ambient glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />

        <div className="mx-auto max-w-7xl max-xl:max-w-full">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-min"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Row 1: Hero (Span 4) */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-4">
              <HeroAI />
            </motion.div>

            {/* Row 2: Analytics Dashboard (Span 4) */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-4">
              <DataAnalytics />
            </motion.div>

            {/* Row 3: Connection Overview (Span 2) + Quick Actions (Span 1x2) */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 relative z-10">
              <ConnectionOverview />
            </motion.div>

            <motion.div variants={itemVariants} className="col-span-1 relative z-10">
              <HealthMonitor />
            </motion.div>

            <motion.div variants={itemVariants} className="col-span-1 grid grid-rows-2 gap-6 relative z-10">
              <QuickActions />
            </motion.div>

            {/* Row 4: Recent Activity (Span 3) + Saved Queries (Span 1) */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-3 relative z-10">
              <RecentActivity />
            </motion.div>

            <motion.div variants={itemVariants} className="col-span-1 relative z-10">
              <SavedQueries />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * @file apps/web/src/components/dashboard/quick-actions.tsx
 * @description Quick action tiles structured for the Bento Grid.
 */

"use client";

import { Link } from "react-router-dom";
import { Plus, Zap } from "lucide-react";
import { motion } from "motion/react";

export function QuickActions() {
  return (
    <>
      <Link to="/sqllab" className="col-span-1 block h-full">
        <motion.div
          className="glass-card flex flex-col items-center justify-center p-6 h-full text-center gap-3 overflow-hidden relative group"
          whileHover={{ y: -2, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-sm z-10">SQL Lab</span>
        </motion.div>
      </Link>

      <Link to="/connections" className="col-span-1 block h-full">
        <motion.div
          className="glass-card flex flex-col items-center justify-center p-6 h-full text-center gap-3 overflow-hidden relative group"
          whileHover={{ y: -2, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Accent hover glow */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />

          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/10">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-sm z-10 text-foreground">New DB</span>
        </motion.div>
      </Link>
    </>
  );
}

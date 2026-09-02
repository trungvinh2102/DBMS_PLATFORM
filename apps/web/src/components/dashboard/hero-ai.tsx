/**
 * @file apps/web/src/components/dashboard/hero-ai.tsx
 * @description Hero section with personalized greeting.
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/use-auth";

export function HeroAI() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Developer";

  return (
    <motion.div
      className="col-span-1 md:col-span-4 lg:col-span-4 glass-card p-6 md:p-8 relative overflow-hidden group"
      whileHover={{ scale: 1.005 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:bg-primary/30 transition-all duration-500" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl opacity-50 group-hover:bg-accent/30 transition-all duration-500" />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {greeting}, <span className="text-primary">{firstName}</span>.
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            What would you like to build or analyze today?
          </p>
        </div>
      </div>
    </motion.div>
  );
}

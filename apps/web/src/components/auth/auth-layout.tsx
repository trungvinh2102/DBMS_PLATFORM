/**
 * @file components/auth/auth-layout.tsx
 * @description Layout wrapper for authentication pages with glassmorphism background
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/30 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-emerald-600/20 blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Glassmorphic Container */}
      <div
        className={cn(
          "relative z-50 w-full max-w-md p-8",
          "bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

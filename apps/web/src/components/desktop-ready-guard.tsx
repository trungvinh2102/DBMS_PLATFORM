/**
 * @file desktop-ready-guard.tsx
 * @description A guard component for Tauri desktop apps that waits for the backend sidecar 
 * to signal readiness before rendering the application.
 */

"use client";

import React, { useState, useEffect } from "react";
import { event } from "@tauri-apps/api";
import { motion, AnimatePresence } from "motion/react";
import { Database, Loader2, Server, Zap } from "lucide-react";

const TRANSITION_DURATION = 0.35;

interface DesktopReadyGuardProps {
  children: React.ReactNode;
}

export function DesktopReadyGuard({ children }: DesktopReadyGuardProps) {
  const [isTauri] = useState(() => typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__);
  const [isReady, setIsReady] = useState(() => typeof window !== "undefined" && !(window as any).__TAURI_INTERNALS__);
  const [status, setStatus] = useState("Initializing system...");

  // Set global flag immediately if we are in Tauri
  if (typeof window !== "undefined") {
    if ((window as any).__TAURI_INTERNALS__) {
      if ((window as any).__BACKEND_READY__ === undefined) {
        (window as any).__BACKEND_READY__ = false;
      }
    } else {
      (window as any).__BACKEND_READY__ = true;
    }
  }

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    let cancelled = false;
    const readyTimers: ReturnType<typeof setTimeout>[] = [];

    const markReady = () => {
      (window as any).__BACKEND_READY__ = true;
      setStatus("Server ready. Launching dashboard...");
      readyTimers.push(setTimeout(() => {
        if (!cancelled) setIsReady(true);
      }, 200));
    };

    // Set up listener for the backend-ready event emitted from Rust lib.rs
    const unlistenPromise = event.listen<boolean>("backend-ready", (eventData) => {
      if (cancelled) return;
      if (eventData.payload) {
        markReady();
      } else {
        setStatus("Critical: Server failed to initialize.");
      }
    });

    let healthInterval: ReturnType<typeof setInterval> | null = null;

    // Fallback: start polling health endpoint after 3s if event hasn't arrived
    // (handles page reload where Rust already emitted backend-ready on first boot)
    readyTimers.push(setTimeout(() => {
      if (cancelled) return;
      setStatus("Connecting to server...");

      const checkHealth = async () => {
        if (cancelled) return;
        try {
          const res = await fetch("http://127.0.0.1:5000/health", { signal: AbortSignal.timeout(3000) });
          if (cancelled) return;
          if (res.ok) {
            if (healthInterval) clearInterval(healthInterval);
            markReady();
          }
        } catch {
          // Backend not ready yet, keep polling
        }
      };
      checkHealth();
      healthInterval = setInterval(checkHealth, 2000);
    }, 3000));

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten());
      readyTimers.forEach(clearTimeout);
      if (healthInterval) clearInterval(healthInterval);
    };
  }, []);

  // Use AnimatePresence for smooth crossfade between loading and app
  return (
    <>
      <AnimatePresence>
        {!isReady && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background"
            exit={{ opacity: 0, transition: { duration: TRANSITION_DURATION, ease: "easeInOut" } }}
          >
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative flex flex-col items-center p-8 text-center max-w-md">
          {/* Main Icon Animation */}
          <motion.div
            className="mb-8 relative"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="h-24 w-24 rounded-3xl bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/10">
              <Database className="h-12 w-12 text-primary animate-pulse" />
            </div>

            {/* Satellite icons or indicators */}
            <motion.div
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Server className="h-4 w-4 text-accent" />
            </motion.div>

            <motion.div
              className="absolute -bottom-2 -left-2 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg"
              animate={{ rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-4 w-4 text-emerald-500" />
            </motion.div>
          </motion.div>

          {/* Text Content */}
          <motion.h1
            className="text-2xl font-black tracking-tighter mb-2 uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            QurioDB
          </motion.h1>

          <motion.div
            className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{status}</span>
          </motion.div>

          {/* Progress Bar (Indeterminate) */}
          <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden relative">
            <motion.div
              className="absolute h-full bg-primary"
              initial={{ left: "-100%", width: "50%" }}
              animate={{ left: "100%" }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          <motion.p
            className="mt-12 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Advanced Architectural Suite
          </motion.p>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
      {isReady && (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: TRANSITION_DURATION, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      )}
    </>
  );
}

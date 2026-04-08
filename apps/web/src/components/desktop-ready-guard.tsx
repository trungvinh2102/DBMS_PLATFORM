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

    // Set up listener for the backend-ready event emitted from Rust lib.rs
    const unlistenPromise = event.listen<boolean>("backend-ready", (eventData) => {
      if (eventData.payload) {
        setStatus("Server ready. Launching dashboard...");
        // Small delay for smooth transition
        setTimeout(() => {
          setIsReady(true);
          (window as any).__BACKEND_READY__ = true;
        }, 800);
      } else {
        setStatus("Critical: Server failed to initialize.");
      }
    });

    // Fallback: If we don't get the event within a certain timeout, we might check health manually
    // or just let it through to show the error state.
    const timeout = setTimeout(() => {
      setStatus("Still waiting for server... trying to connect manually.");
      // In a real scenario, we might hit GET /health here
    }, 5000);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      clearTimeout(timeout);
    };
  }, []);

  if (!isTauri || isReady) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
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
            DBMS Platform
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
    </AnimatePresence>
  );
}

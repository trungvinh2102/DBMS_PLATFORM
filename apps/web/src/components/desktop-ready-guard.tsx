/** Desktop startup guard with a transparent browser-mode bypass. */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Database, Loader2, Server, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { configureDesktopApi, isTauriRuntime } from "@/lib/runtime-api";
import {
  getBackendStatus,
  quitDesktop,
  restartBackend,
  subscribeBackendStatus,
  type BackendErrorCode,
  type BackendStatus,
} from "@/lib/desktop-backend";

const TRANSITION_DURATION = 0.35;

const ERROR_COPY: Record<BackendErrorCode, string> = {
  spawnFailed: "The local backend could not be started.",
  sidecarExited: "The local backend stopped during startup.",
  readinessTimeout: "The local backend took too long to become ready.",
  identityMismatch: "The local backend could not be verified.",
  restartFailed: "The local backend could not be restarted.",
};

interface DesktopReadyGuardProps {
  children: React.ReactNode;
}

export function acceptBackendStatus(current: BackendStatus, next: BackendStatus): boolean {
  if (next.generation > current.generation) return true;
  if (next.generation < current.generation) return false;
  if (current.status === "failed") return false;
  if (current.status === "ready") return next.status !== "starting";
  return next.status !== "starting" || current.status === "starting";
}

export function DesktopReadyGuard({ children }: DesktopReadyGuardProps) {
  const [isTauri] = useState(isTauriRuntime);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(() =>
    isTauri
      ? { status: "starting", generation: 0 }
      : { status: "ready", generation: 0, apiBaseUrl: "/api/" },
  );
  const [actionPending, setActionPending] = useState(false);
  const backendStatusRef = useRef(backendStatus);
  const mountedRef = useRef(true);
  const applyStatusRef = useRef<(nextStatus: BackendStatus) => void>(() => undefined);

  useEffect(() => {
    if (!isTauri) return;

    mountedRef.current = true;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    const applyStatus = (nextStatus: BackendStatus) => {
      if (cancelled) return;
      setBackendStatus((currentStatus) => {
        if (!acceptBackendStatus(currentStatus, nextStatus)) return currentStatus;

        if (nextStatus.status === "ready") {
          try {
            configureDesktopApi(nextStatus.apiBaseUrl);
          } catch {
            const failedStatus: BackendStatus = {
              status: "failed",
              generation: nextStatus.generation,
              errorCode: "identityMismatch",
            };
            backendStatusRef.current = failedStatus;
            return failedStatus;
          }
        }
        backendStatusRef.current = nextStatus;
        return nextStatus;
      });
    };
    applyStatusRef.current = applyStatus;

    void (async () => {
      unlisten = await subscribeBackendStatus(applyStatus);
      if (cancelled) {
        unlisten();
        return;
      }
      applyStatus(await getBackendStatus());
    })().catch(() => {
      applyStatus({ status: "failed", generation: backendStatusRef.current.generation, errorCode: "restartFailed" });
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      applyStatusRef.current = () => undefined;
      unlisten?.();
    };
  }, [isTauri]);

  const handleRetry = async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      const nextStatus = await restartBackend();
      if (!mountedRef.current) return;
      setActionPending(false);
      applyStatusRef.current(nextStatus);
    } catch {
      if (!mountedRef.current) return;
      setActionPending(false);
      setBackendStatus((currentStatus) => {
        const nextStatus: BackendStatus = {
          status: "failed",
          generation: currentStatus.generation,
          errorCode: "restartFailed",
        };
        backendStatusRef.current = nextStatus;
        return nextStatus;
      });
    }
  };

  const handleQuit = async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await quitDesktop();
    } catch {
      if (mountedRef.current) setActionPending(false);
    }
  };

  if (!isTauri) return <>{children}</>;

  const isStarting = backendStatus.status === "starting" || actionPending;
  const isFailed = backendStatus.status === "failed" && !actionPending;
  const showActions = backendStatus.status === "failed";
  const statusText = isStarting
    ? "Initializing system..."
    : ERROR_COPY[backendStatus.status === "failed" ? backendStatus.errorCode : "restartFailed"];

  return (
    <>
      <AnimatePresence>
        {backendStatus.status !== "ready" && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background"
            exit={{ opacity: 0, transition: { duration: TRANSITION_DURATION, ease: "easeInOut" } }}
          >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full${isFailed ? "" : " animate-pulse"}`} />
            <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 blur-[120px] rounded-full${isFailed ? "" : " animate-pulse"}`} style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative flex flex-col items-center p-8 text-center max-w-md">
            <motion.div
              className="mb-8 relative"
              animate={isFailed ? undefined : { scale: [1, 1.05, 1] }}
              transition={isFailed ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="h-24 w-24 rounded-3xl bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/10">
                <Database className={`h-12 w-12 text-primary${isFailed ? "" : " animate-pulse"}`} />
              </div>
              <motion.div
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg"
                animate={isFailed ? undefined : { rotate: 360 }}
                transition={isFailed ? undefined : { duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <Server className="h-4 w-4 text-accent" />
              </motion.div>
              <motion.div
                className="absolute -bottom-2 -left-2 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg"
                animate={isFailed ? undefined : { rotate: -360 }}
                transition={isFailed ? undefined : { duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="h-4 w-4 text-emerald-500" />
              </motion.div>
            </motion.div>

            <motion.h1 className="text-2xl font-black tracking-tighter mb-2 uppercase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              QurioDB
            </motion.h1>

            <div
              role="status"
              aria-busy={isStarting ? true : undefined}
              className="flex flex-col items-center text-muted-foreground font-medium text-sm mb-8"
            >
              <div className="flex items-center gap-2">
                {isStarting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                <span>{statusText}</span>
              </div>
              {showActions && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={handleRetry} disabled={actionPending}>Retry</Button>
                  <Button variant="outline" onClick={handleQuit} disabled={actionPending}>Quit</Button>
                </div>
              )}
            </div>

            {isStarting && (
              <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden relative">
                <motion.div
                  className="absolute h-full bg-primary"
                  initial={{ left: "-100%", width: "50%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}

            <motion.p className="mt-12 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              Advanced Architectural Suite
            </motion.p>
          </div>
          </motion.div>
        )}
        {backendStatus.status === "ready" && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: TRANSITION_DURATION, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

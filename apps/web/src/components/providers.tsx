"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { DesktopReadyGuard } from "./desktop-ready-guard";

const ReactQueryDevtools = React.lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })),
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <DesktopReadyGuard>
          {children}
        </DesktopReadyGuard>
        {import.meta.env.DEV && (
          <React.Suspense fallback={null}>
            <ReactQueryDevtools />
          </React.Suspense>
        )}
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}

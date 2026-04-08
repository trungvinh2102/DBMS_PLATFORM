/**
 * @file query-client.ts
 * @description TanStack React Query client configuration.
 * Standalone QueryClient without tRPC dependency.
 */

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Suppress network errors while backend is still starting up in desktop mode
      const isBackendReady = (window as any).__BACKEND_READY__ !== false;
      if (!isBackendReady && error.message.includes("Network Error")) {
        console.warn("Suppressing Network Error toast because backend is still initializing");
        return;
      }

      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
    },
  },
});

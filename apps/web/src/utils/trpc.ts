/**
 * @file trpc.ts
 * @description tRPC client configuration and React Query integration.
 * Forces rebuild.
 */

import type { AppRouter } from "@dbms-platform/api/routers/index";

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        // Read token from zustand storage (it's stored in localStorage under 'auth-storage')
        // We parse it manually or assume a predictable format.
        // Simplest way for client-side only:
        if (typeof window !== "undefined") {
          const storage = localStorage.getItem("auth-storage");
          if (storage) {
            try {
              const parsed = JSON.parse(storage);
              const token = parsed.state?.token;
              if (token) {
                return {
                  Authorization: `Bearer ${token}`,
                };
              }
            } catch (e) {
              // ignore
            }
          }
        }
        return {};
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

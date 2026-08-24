import React from "react";
import { act, renderHook } from "../../test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const { execute, ConfirmationError } = vi.hoisted(() => {
  class ConfirmationError extends Error {
    confirmation = { confirmationToken: "token", expiresAt: "2026-08-24T12:00:00Z", risk: "write", reason: "Confirm" } as const;
  }
  return { execute: vi.fn().mockRejectedValue(new ConfirmationError()), ConfirmationError };
});

vi.mock("@/lib/api-client", () => ({
  databaseApi: new Proxy({ execute }, { get: (target, property) => target[property as keyof typeof target] || vi.fn().mockResolvedValue([]) }),
  SqlConfirmationRequiredError: ConfirmationError,
}));

import { useSQLLabQuery } from "@/app/sqllab/hooks/use-sqllab-query";

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useSQLLabQuery confirmation", () => {
  it("surfaces confirmation without treating it as a generic execution failure", async () => {
    const onConfirmationRequired = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useSQLLabQuery({
      selectedDS: "db-1", sql: "UPDATE users SET active = true", onSuccess: vi.fn(), onError,
      onConfirmationRequired,
    }), { wrapper });

    await act(async () => { await result.current.handleRun(); });

    expect(onConfirmationRequired).toHaveBeenCalledWith(expect.objectContaining({
      databaseId: "db-1", confirmationToken: "token",
    }));
    expect(onError).not.toHaveBeenCalled();
  });
});

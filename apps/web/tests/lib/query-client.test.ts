import { describe, it, expect, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("query-client", () => {
  it("should have default config", () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30000);
  });

  it("should handle global errors and call toast", () => {
    const error = new Error("Network error");
    const query = { invalidate: vi.fn() };

    // access the queryCache and simulate an error
    const cache = queryClient.getQueryCache();
    (cache.config.onError as any)(error, query);

    expect(toast.error).toHaveBeenCalledWith("Network error", {
      action: {
        label: "retry",
        onClick: expect.any(Function),
      },
    });
  });
});

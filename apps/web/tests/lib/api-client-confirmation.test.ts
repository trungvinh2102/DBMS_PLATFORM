import { describe, expect, it } from "vitest";

import { api, SqlConfirmationRequiredError } from "@/lib/api-client";

describe("SQL execution confirmation responses", () => {
  it("preserves a structured confirmation response", async () => {
    const rejected = (api.interceptors.response as any).handlers[0].rejected;
    const response = {
      status: 409,
      data: {
        detail: {
          code: "sql_confirmation_required",
          confirmationToken: "approval-token",
          expiresAt: "2026-08-24T12:00:00+00:00",
          risk: "destructive",
          reason: "DROP statements require confirmation.",
        },
      },
    };

    await expect(rejected({ response, message: "Request failed" })).rejects.toBeInstanceOf(
      SqlConfirmationRequiredError,
    );
  });
});

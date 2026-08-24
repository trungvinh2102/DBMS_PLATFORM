/**
 * @file DiagnosticsTabView.test.tsx
 * @description Verifies diagnostics reload when Object Info requests a refresh.
 */

import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DiagnosticsTabView } from "@/app/sqllab/components/objectpanel/DiagnosticsTabView";

const { getDiagnosticsMock } = vi.hoisted(() => ({
  getDiagnosticsMock: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/api-client", () => ({
  databaseApi: { getDiagnostics: getDiagnosticsMock },
}));

describe("DiagnosticsTabView", () => {
  it("reloads diagnostics when the selected object is refreshed", async () => {
    const { rerender } = render(
      <DiagnosticsTabView databaseId="db-1" table="users" refreshVersion={0} />,
    );

    await waitFor(() => {
      expect(getDiagnosticsMock).toHaveBeenCalledOnce();
    });

    rerender(
      <DiagnosticsTabView databaseId="db-1" table="users" refreshVersion={1} />,
    );

    await waitFor(() => {
      expect(getDiagnosticsMock).toHaveBeenCalledTimes(2);
    });
  });
});

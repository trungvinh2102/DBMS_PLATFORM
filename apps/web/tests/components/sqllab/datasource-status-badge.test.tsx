/**
 * @file datasource-status-badge.test.tsx
 * @description Focused unit and integration tests for SQLLab datasource status badge and toolbar integration.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "../../test-utils";
import userEvent from "@testing-library/user-event";
import { databaseApi } from "@/lib/api-client";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";
import { DatasourceStatusBadge } from "@/app/sqllab/components/DatasourceStatusBadge";
import { SQLLabToolbar } from "@/app/sqllab/components/SQLLabToolbar";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockHandleRun = vi.fn();
let mockSelectedDS = "ds-1";
let mockSelectedDSType = "postgresql";

vi.mock("@/app/sqllab/context/SQLLabContext", () => {
  const noop = () => {};
  return {
    useSQLLabContext: () => ({
      selectedDS: mockSelectedDS,
      selectedDSType: mockSelectedDSType,
      isRelational: true,
      selectedSql: "",
      queryLimit: 1000,
      setQueryLimit: noop,
      showRightPanel: true,
      rightPanelMode: "object" as const,
      setShowRightPanel: noop,
      setRightPanelMode: noop,
      setShowAISidebar: noop,
      handleRun: mockHandleRun,
      handleStop: noop,
      handleExplain: noop,
      handleFormat: noop,
      handleSave: noop,
      handleOpen: noop,
      handleUndo: noop,
      handleRedo: noop,
      handleRollback: noop,
      handleImport: noop,
      handleExport: noop,
      resolveSelectedSql: () => "",
    }),
    useSQLLabResultContext: () => ({
      executing: false,
      autoCommit: true,
      setAutoCommit: noop,
    }),
  };
});

describe("DatasourceStatusBadge & SQLLabToolbar Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockHandleRun.mockClear();
    mockSelectedDS = "ds-1";
    mockSelectedDSType = "postgresql";

    // Setup MSW handler for probe endpoint
    server.use(
      http.post("*/api/database/test", () => {
        return HttpResponse.json({ success: true, message: "Connected successfully" });
      }),
    );
  });

  it("integrates with SQLLabToolbar: automatically probes active datasource without toolbar badge/spinner/tooltip, and keeps Run enabled", async () => {
    const deferred = createDeferred<{ success: boolean; message: string }>();
    const testSpy = vi.spyOn(databaseApi, "test").mockReturnValue(deferred.promise as any);

    render(<SQLLabToolbar />);

    // Exactly one probe for toolbar's active datasource {id, type}
    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledTimes(1);
      expect(testSpy).toHaveBeenCalledWith({ id: "ds-1", type: "postgresql" });
    });

    // Toolbar must NOT have any connection status button, badge, spinner, or role="status"
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /checking connection/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /database connected/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connection unavailable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /no database selected/i })).not.toBeInTheDocument();

    // Run button is enabled while checking (not blocked by probe)
    const runBtn = screen.getByRole("button", { name: "Run" });
    expect(runBtn).toBeEnabled();

    // Settle probe
    await act(async () => {
      deferred.resolve({ success: true, message: "Connected successfully" });
    });

    // Remains clean without toolbar status indicator or popup on success
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(runBtn).toBeEnabled();
  });

  it("probes valid connection automatically and shows no popup while checking or on success", async () => {
    const deferred = createDeferred<{ success: boolean; message: string }>();
    const testSpy = vi.spyOn(databaseApi, "test").mockReturnValue(deferred.promise as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledTimes(1);
      expect(testSpy).toHaveBeenCalledWith({ id: "ds-1", type: "postgresql" });
    });

    // No popup or toolbar status while checking
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve({ success: true, message: "Connected successfully" });
    });

    // Still no popup on success
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
  });

  it("shows error popup on unavailable failure with 'Connection failed' title and exact error message", async () => {
    vi.spyOn(databaseApi, "test").mockResolvedValue({
      success: false,
      message: "Connection refused: database host unreachable",
    } as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Connection failed" })).toBeInTheDocument();
    expect(screen.getByText("Connection refused: database host unreachable")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(closeBtn).toBeEnabled();
    expect(retryBtn).toBeEnabled();

    // No toolbar status badge or tooltip remains
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows error popup on 401/403 forbidden error with 'Connection failed' title and permission message", async () => {
    const error403 = new Error("Forbidden");
    (error403 as any).status = 403;
    (error403 as any).response = { status: 403, data: { detail: "Forbidden" } };

    vi.spyOn(databaseApi, "test").mockRejectedValue(error403);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Connection failed" })).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to test this connection.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("falls back to default message when error message is empty", async () => {
    vi.spyOn(databaseApi, "test").mockResolvedValue({
      success: false,
      message: "",
    } as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Connection failed" })).toBeInTheDocument();
    expect(screen.getByText("Connection unavailable")).toBeInTheDocument();
  });

  it("closes popup when Close button is clicked and does not immediately reopen", async () => {
    const user = userEvent.setup();
    vi.spyOn(databaseApi, "test").mockResolvedValue({
      success: false,
      message: "Connection refused",
    } as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    await screen.findByRole("dialog");
    const closeBtn = screen.getByRole("button", { name: "Close" });

    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Ensure it remains closed
    expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
  });

  it("dismisses popup on Escape key", async () => {
    const user = userEvent.setup();
    vi.spyOn(databaseApi, "test").mockResolvedValue({
      success: false,
      message: "Network error",
    } as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("handles Retry flow: disables while pending, closes when retry succeeds", async () => {
    const user = userEvent.setup();
    const deferredRetry = createDeferred<{ success: boolean; message: string }>();

    const testSpy = vi
      .spyOn(databaseApi, "test")
      .mockResolvedValueOnce({ success: false, message: "Initial failure" } as any)
      .mockReturnValueOnce(deferredRetry.promise as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    await screen.findByRole("dialog");
    expect(screen.getByText("Initial failure")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeEnabled();

    await user.click(retryBtn);

    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledTimes(2);
    });

    // Retry button is disabled while pending
    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
    // Dialog remains open while pending
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Settle retry with success
    await act(async () => {
      deferredRetry.resolve({ success: true, message: "Connected successfully" });
    });

    // Popup closes on successful retry
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("handles Retry flow: stays open and updates content when retry fails again", async () => {
    const user = userEvent.setup();
    const deferredRetry = createDeferred<{ success: boolean; message: string }>();

    const testSpy = vi
      .spyOn(databaseApi, "test")
      .mockResolvedValueOnce({ success: false, message: "Initial failure" } as any)
      .mockReturnValueOnce(deferredRetry.promise as any);

    render(<DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />);

    await screen.findByRole("dialog");
    expect(screen.getByText("Initial failure")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledTimes(2);
    });

    // Settle retry with second failure
    await act(async () => {
      deferredRetry.resolve({ success: false, message: "Second failure: timeout" });
    });

    // Popup remains open with updated error content
    await waitFor(() => {
      expect(screen.getByText("Second failure: timeout")).toBeInTheDocument();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("resets and probes anew when connection changes from A to B", async () => {
    const deferredA = createDeferred<{ success: boolean; message: string }>();
    const deferredB = createDeferred<{ success: boolean; message: string }>();

    const testSpy = vi.spyOn(databaseApi, "test").mockImplementation(((payload: { id: string; type: string }) => {
      if (payload.id === "ds-a") return deferredA.promise;
      if (payload.id === "ds-b") return deferredB.promise;
      return Promise.resolve({ success: true, message: "ok" });
    }) as any);

    const { rerender } = render(
      <DatasourceStatusBadge connection={{ id: "ds-a", type: "postgresql" }} />,
    );

    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledWith({ id: "ds-a", type: "postgresql" });
    });

    // Fail A -> popup opens
    await act(async () => {
      deferredA.resolve({ success: false, message: "DS A connection error" });
    });

    await screen.findByRole("dialog");
    expect(screen.getByText("DS A connection error")).toBeInTheDocument();

    // Switch to B -> popup closes while B is checking
    rerender(<DatasourceStatusBadge connection={{ id: "ds-b", type: "mysql" }} />);

    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledWith({ id: "ds-b", type: "mysql" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Fail B -> popup opens for B
    await act(async () => {
      deferredB.resolve({ success: false, message: "DS B connection timeout" });
    });

    await screen.findByRole("dialog");
    expect(screen.getByText("DS B connection timeout")).toBeInTheDocument();
  });

  it("does not render toolbar status badge or popup when connection is null/empty", () => {
    const testSpy = vi.spyOn(databaseApi, "test");
    render(<DatasourceStatusBadge connection={undefined} />);

    expect(testSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

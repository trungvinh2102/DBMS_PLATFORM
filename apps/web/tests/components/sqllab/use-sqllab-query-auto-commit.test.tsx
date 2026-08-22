import React from "react";
import { act, render, renderHook, waitFor } from "../../test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue({ data: [], columns: [] }),
}));

vi.mock("@/lib/api-client", () => ({
  databaseApi: new Proxy({ execute }, {
    get: (target, property) => target[property as keyof typeof target] || vi.fn().mockResolvedValue([]),
  }),
}));

import { useSQLLabQuery } from "@/app/sqllab/hooks/use-sqllab-query";
import { SQLLabProvider, useSQLLabContext, useSQLLabResultContext } from "@/app/sqllab/context/SQLLabContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useSQLLabQuery Auto Commit", () => {
  beforeEach(() => execute.mockClear());

  it("passes the current Auto Commit snapshot to execution", async () => {
    const { result } = renderHook(() => useSQLLabQuery({
      selectedDS: "db-1",
      sql: "UPDATE users SET active = true",
      autoCommit: false,
      onSuccess: vi.fn(),
      onError: vi.fn(),
    }), { wrapper });

    await act(async () => {
      await result.current.handleRun();
    });

    await waitFor(() => expect(execute).toHaveBeenCalledWith(
      "db-1",
      "UPDATE users SET active = true",
      false,
      100,
    ));
  });

  it("passes true when Auto Commit uses its default", async () => {
    const { result } = renderHook(() => useSQLLabQuery({
      selectedDS: "db-1",
      sql: "SELECT 1",
      onSuccess: vi.fn(),
      onError: vi.fn(),
    }), { wrapper });

    await act(async () => {
      await result.current.handleRun();
    });

    await waitFor(() => expect(execute).toHaveBeenCalledWith(
      "db-1",
      "SELECT 1",
      true,
      100,
    ));
  });

  it("keeps false through the real SQLLab success callback and result tab before the second run", async () => {
    function Runner() {
      const lab = useSQLLabContext();
      const result = useSQLLabResultContext();
      return (
        <>
          <button onClick={() => { lab.setSelectedDS("db-1"); lab.setSql("UPDATE users SET active = true"); result.setAutoCommit(false); }}>
            Configure
          </button>
          <button onClick={() => lab.handleRun()}>Execute</button>
          <output data-testid="auto-commit">{String(result.autoCommit)}</output>
          <output data-testid="result-tab">{result.activeResultTab}</output>
        </>
      );
    }

    const view = render(<SQLLabProvider><Runner /></SQLLabProvider>);
    await act(async () => { view.getByRole("button", { name: "Configure" }).click(); });
    await act(async () => { view.getByRole("button", { name: "Execute" }).click(); });
    await waitFor(() => expect(view.getByTestId("result-tab")).toHaveTextContent("results"));
    expect(view.getByTestId("auto-commit")).toHaveTextContent("false");
    await act(async () => { view.getByRole("button", { name: "Execute" }).click(); });

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute).toHaveBeenNthCalledWith(1, "db-1", "UPDATE users SET active = true", false, 1000);
    expect(execute).toHaveBeenNthCalledWith(2, "db-1", "UPDATE users SET active = true", false, 1000);
  });
});

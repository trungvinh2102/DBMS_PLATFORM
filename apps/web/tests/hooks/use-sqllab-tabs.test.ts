import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { useSQLLabTabs } from "@/app/sqllab/hooks/use-sqllab-tabs";

describe("useSQLLabTabs persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces a burst of SQL updates into one tabs write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useSQLLabTabs());
    setItem.mockClear();

    act(() => {
      result.current.updateActiveTab({ sql: "S" });
      result.current.updateActiveTab({ sql: "SE" });
      result.current.updateActiveTab({ sql: "SELECT" });
    });

    expect(setItem).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith("sqllab_tabs", expect.stringContaining('"sql":"SELECT"'));
  });

  it("flushes pending SQL when the active tab changes", async () => {
    const { result } = renderHook(() => useSQLLabTabs());

    await act(async () => {
      result.current.updateActiveTab({ sql: "SELECT 1" });
      await Promise.resolve();
    });

    act(() => {
      result.current.addTab("", "");
    });

    const persistedTabs = JSON.parse(localStorage.getItem("sqllab_tabs") ?? "[]");
    expect(persistedTabs).toEqual(expect.arrayContaining([expect.objectContaining({ sql: "SELECT 1" })]));
  });

  it("flushes pending SQL on pagehide", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useSQLLabTabs());
    setItem.mockClear();

    act(() => result.current.updateActiveTab({ sql: "SELECT 1" }));
    act(() => window.dispatchEvent(new Event("pagehide")));

    expect(setItem).toHaveBeenCalledWith("sqllab_tabs", expect.stringContaining('"sql":"SELECT 1"'));
  });

  it("flushes pending SQL before beforeunload", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useSQLLabTabs());
    setItem.mockClear();

    act(() => result.current.updateActiveTab({ sql: "SELECT 1" }));
    act(() => window.dispatchEvent(new Event("beforeunload")));

    expect(setItem).toHaveBeenCalledWith("sqllab_tabs", expect.stringContaining('"sql":"SELECT 1"'));
  });

  it("flushes pending SQL when a tab closes", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useSQLLabTabs());
    setItem.mockClear();

    act(() => result.current.addTab("", ""));
    act(() => result.current.updateActiveTab({ sql: "SELECT 1" }));
    const closingTabId = result.current.activeTabId;

    act(() => result.current.closeTab(closingTabId));

    expect(setItem).toHaveBeenCalledWith("sqllab_tabs", expect.stringContaining('"sql":"SELECT 1"'));
    const persistedTabs = JSON.parse(localStorage.getItem("sqllab_tabs") ?? "[]");
    expect(persistedTabs).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: closingTabId })]));
  });

  it("persists the removed snapshot when an inactive tab closes", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useSQLLabTabs());

    act(() => result.current.addTab("", ""));
    setItem.mockClear();
    const inactiveTabId = "1";

    act(() => result.current.closeTab(inactiveTabId));

    const persistedTabs = JSON.parse(localStorage.getItem("sqllab_tabs") ?? "[]");
    expect(persistedTabs).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: inactiveTabId })]));

    act(() => vi.advanceTimersByTime(300));

    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("persists the active tab key and clears its pending timer on unmount", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result, unmount } = renderHook(() => useSQLLabTabs());
    setItem.mockClear();

    act(() => result.current.addTab("", ""));
    expect(localStorage.getItem("sqllab_active_tab")).toBe(result.current.activeTabId);

    act(() => result.current.updateActiveTab({ sql: "SELECT 1" }));
    unmount();
    expect(localStorage.getItem("sqllab_tabs")).toContain('"sql":"SELECT 1"');
    const writesAfterUnmount = setItem.mock.calls.length;

    act(() => vi.advanceTimersByTime(300));

    expect(setItem.mock.calls.length).toBe(writesAfterUnmount);
  });

  it("does not overwrite hydrated tabs during StrictMode-like cleanup", () => {
    const savedTabs = [
      {
        id: "saved",
        name: "saved_query",
        sql: "SELECT saved;",
        selectedDS: "db-1",
        selectedSchema: "public",
        results: [],
        columns: [],
        error: null,
      },
    ];
    localStorage.setItem("sqllab_tabs", JSON.stringify(savedTabs));

    const { unmount } = renderHook(() => useSQLLabTabs(), {
      wrapper: StrictMode,
    });

    unmount();

    expect(JSON.parse(localStorage.getItem("sqllab_tabs") ?? "null")).toEqual(savedTabs);
  });
});

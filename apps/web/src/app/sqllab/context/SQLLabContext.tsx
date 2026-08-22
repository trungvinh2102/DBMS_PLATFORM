/**
 * @file SQLLabContext.tsx
 * @description Context to share SQLLab state across components and reduce prop drilling.
 */

import React, { createContext, useContext, ReactNode, useMemo, useRef } from "react";
import { useSQLLab } from "../hooks/useSQLLab";
import type { SQLLabTab } from "../types";

export type SQLLabContextType = ReturnType<typeof useSQLLab>;
export type SQLLabStableContextType = Omit<
  SQLLabContextType,
  | "sql" | "tabs" | "activeTabId" | "activeTab" | "cursorPos"
  | "results" | "columns" | "error" | "executing" | "executionTime"
   | "currentTData" | "currentTColumns" | "loadingTData" | "activeResultTab" | "setActiveResultTab" | "autoCommit" | "setAutoCommit"
>;
export type SQLLabEditorTab = Pick<SQLLabTab, "id" | "name" | "sql">;
export type SQLLabEditorContextType = Pick<
  SQLLabContextType,
  "sql" | "setSql" | "activeTabId" | "setActiveTabId" | "setCursorPos" |
    "tabSize" | "undoTrigger" | "redoTrigger"
> & {
  tabs: SQLLabEditorTab[];
};
export type SQLLabTabMetadataContextType = {
  activeTabName?: string;
};
export type SQLLabResultContextType = Pick<
  SQLLabContextType,
  "results" | "columns" | "error" | "executing" | "executionTime" |
  "currentTData" | "currentTColumns" | "loadingTData" | "activeResultTab" | "setActiveResultTab" | "autoCommit" | "setAutoCommit"
>;

const SQLLabContext = createContext<SQLLabStableContextType | null>(null);
const SQLLabEditorContext = createContext<SQLLabEditorContextType | null>(null);
const SQLLabTabMetadataContext = createContext<SQLLabTabMetadataContextType | null>(null);
const SQLLabResultContext = createContext<SQLLabResultContextType | null>(null);
const SQLLabCursorContext = createContext<Pick<SQLLabContextType, "cursorPos"> | null>(null);

export function SQLLabProvider({ children }: { children: ReactNode }) {
  const value = useSQLLab();
  const latestValue = useRef(value);
  latestValue.current = value;

  const {
    sql, cursorPos, tabs, activeTabId, activeTab, results, columns, error, executing, executionTime,
    currentTData, currentTColumns, loadingTData, activeResultTab, setActiveResultTab, autoCommit, setAutoCommit, ...stableSource
  } = value;
  // The active tab identity changes on every SQL/result update because tabs are
  // recreated, so it must never feed the stable context dependencies. It stays in
  // the hot result context below, derived from the tab list as a fallback.
  const effectiveActiveTab =
    activeTab ?? (tabs.find((tab) => tab.id === activeTabId) || tabs[0]);
  const stableKeys = Object.keys(stableSource).filter(
    (key) => typeof stableSource[key as keyof typeof stableSource] !== "function",
  );
  const stableDependencies = stableKeys.map((key) => stableSource[key as keyof typeof stableSource]);
  const stableValue = useMemo<SQLLabStableContextType>(() => {
    const nextValue = { ...stableSource } as SQLLabStableContextType;
    for (const key of Object.keys(nextValue) as Array<keyof SQLLabStableContextType>) {
      if (typeof nextValue[key] === "function") {
        (nextValue as any)[key] = (...args: any[]) => (latestValue.current[key] as any)(...args);
      }
    }
    return nextValue;
    // The dependency list intentionally excludes editor-hot state and the active
    // tab identity. Function properties are proxied to the latest hook value above
    // so stable consumers never use stale actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, stableDependencies);

  const editorTabsKey = value.tabs.map((tab) => `${tab.id}\u0000${tab.name}\u0000${tab.sql}`).join("\u0001");
  const editorTabs = useMemo<SQLLabEditorTab[]>(
    () => value.tabs.map(({ id, name, sql }) => ({ id, name, sql })),
    [editorTabsKey],
  );
  const tabMetadataKey = value.tabs.map((tab) => `${tab.id}\u0000${tab.name}`).join("\u0001");
  const tabMetadataValue = useMemo<SQLLabTabMetadataContextType>(() => ({
    activeTabName: value.tabs.find((tab) => tab.id === value.activeTabId)?.name,
  }), [tabMetadataKey, value.activeTabId]);
  const setSql = useMemo(
    () => (...args: Parameters<SQLLabContextType["setSql"]>) => latestValue.current.setSql(...args),
    [],
  );
  const setActiveTabId = useMemo(
    () => (...args: Parameters<SQLLabContextType["setActiveTabId"]>) => latestValue.current.setActiveTabId(...args),
    [],
  );
  const setCursorPos = useMemo(
    () => (...args: Parameters<SQLLabContextType["setCursorPos"]>) => latestValue.current.setCursorPos(...args),
    [],
  );
  const editorValue = useMemo<SQLLabEditorContextType>(() => ({
    sql: value.sql,
    setSql,
    tabs: editorTabs,
    activeTabId: value.activeTabId,
    setActiveTabId,
    setCursorPos,
    tabSize: value.tabSize,
    undoTrigger: value.undoTrigger,
    redoTrigger: value.redoTrigger,
  }), [
    value.sql,
    setSql,
    editorTabs,
    value.activeTabId,
    setActiveTabId,
    setCursorPos,
    value.tabSize,
    value.undoTrigger,
    value.redoTrigger,
  ]);
  const resultValue = useMemo<SQLLabResultContextType>(() => ({
    results: effectiveActiveTab?.results || [],
    columns: effectiveActiveTab?.columns || [],
    error: effectiveActiveTab?.error || null,
    executing: value.executing,
    executionTime: value.executionTime,
    currentTData: value.currentTData,
    currentTColumns: value.currentTColumns,
    loadingTData: value.loadingTData,
    activeResultTab: value.activeResultTab,
    setActiveResultTab: value.setActiveResultTab,
    autoCommit: value.autoCommit,
    setAutoCommit: value.setAutoCommit,
  }), [
    effectiveActiveTab?.results,
    effectiveActiveTab?.columns,
    effectiveActiveTab?.error,
    value.executing,
    value.executionTime,
    value.currentTData,
    value.currentTColumns,
    value.loadingTData,
    value.activeResultTab,
    value.setActiveResultTab,
    value.autoCommit,
    value.setAutoCommit,
  ]);
  const cursorValue = useMemo(() => ({ cursorPos: value.cursorPos }), [value.cursorPos]);
  
  // Debugging: Verify provider value
  if (!value) {
    console.error("SQLLabProvider: useSQLLab() returned null or undefined!");
  }

  return (
    <SQLLabContext.Provider value={stableValue}>
      <SQLLabEditorContext.Provider value={editorValue}>
        <SQLLabTabMetadataContext.Provider value={tabMetadataValue}>
          <SQLLabResultContext.Provider value={resultValue}>
            <SQLLabCursorContext.Provider value={cursorValue}>
              {children}
            </SQLLabCursorContext.Provider>
          </SQLLabResultContext.Provider>
        </SQLLabTabMetadataContext.Provider>
      </SQLLabEditorContext.Provider>
    </SQLLabContext.Provider>
  );
}

export function useSQLLabContext() {
  const context = useContext(SQLLabContext);
  if (!context) {
    console.error("useSQLLabContext error: No context found. This usually means SQLLabProvider is missing or useSQLLab() failed to initialize.");
    throw new Error("useSQLLabContext must be used within a SQLLabProvider");
  }
  return context;
}

export function useSQLLabEditorContext() {
  const context = useContext(SQLLabEditorContext);
  if (!context) throw new Error("useSQLLabEditorContext must be used within a SQLLabProvider");
  return context;
}

export function useSQLLabTabMetadataContext() {
  const context = useContext(SQLLabTabMetadataContext);
  if (!context) throw new Error("useSQLLabTabMetadataContext must be used within a SQLLabProvider");
  return context;
}

export function useSQLLabResultContext() {
  const context = useContext(SQLLabResultContext);
  if (!context) throw new Error("useSQLLabResultContext must be used within a SQLLabProvider");
  return context;
}

export function useSQLLabCursorContext() {
  const context = useContext(SQLLabCursorContext);
  if (!context) throw new Error("useSQLLabCursorContext must be used within a SQLLabProvider");
  return context;
}

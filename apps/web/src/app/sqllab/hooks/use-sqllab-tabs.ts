/**
 * @file use-sqllab-tabs.ts
 * @description Hook to manage SQL Lab query tabs and their persistence.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const TABS_PERSISTENCE_DEBOUNCE_MS = 300;

export interface QueryTab {
  id: string;
  name: string;
  sql: string;
  selectedDS: string;
  selectedSchema: string;
  results: Record<string, unknown>[];
  columns: any[];
  error: string | null;
  savedQueryId?: string;
}

export function useSQLLabTabs() {
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: "1",
      name: "console_1",
      sql: "",
      selectedDS: "",
      selectedSchema: "",
      results: [],
      columns: [],
      error: null,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");
  const pendingTabsRef = useRef<QueryTab[] | null>(null);
  const persistenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedTabsRef = useRef<QueryTab[] | null>(null);
  const hydrationCompleteRef = useRef(false);
  const [hydrationComplete, setHydrationComplete] = useState(false);

  const flushPersistence = useCallback(() => {
    if (!hydrationCompleteRef.current) return;

    if (persistenceTimerRef.current) {
      clearTimeout(persistenceTimerRef.current);
      persistenceTimerRef.current = null;
    }

    if (pendingTabsRef.current) {
      localStorage.setItem("sqllab_tabs", JSON.stringify(pendingTabsRef.current));
      pendingTabsRef.current = null;
    }
  }, []);

  // Persistence
  useEffect(() => {
    const savedTabs = localStorage.getItem("sqllab_tabs");
    const savedActiveId = localStorage.getItem("sqllab_active_tab");
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
          if (savedActiveId) setActiveTabId(savedActiveId);
        }
      } catch (e) {
        console.error("Failed to load tabs", e);
      }
    }
    setHydrationComplete(true);
  }, []);

  useEffect(() => {
    hydrationCompleteRef.current = hydrationComplete;
  }, [hydrationComplete]);

  useEffect(() => {
    if (!hydrationComplete) return;

    const previousTabs = committedTabsRef.current;
    committedTabsRef.current = tabs;
    pendingTabsRef.current = tabs;
    if (persistenceTimerRef.current) clearTimeout(persistenceTimerRef.current);

    if (previousTabs && tabs.length < previousTabs.length) {
      flushPersistence();
      return;
    }

    persistenceTimerRef.current = setTimeout(
      flushPersistence,
      TABS_PERSISTENCE_DEBOUNCE_MS,
    );
  }, [tabs, flushPersistence, hydrationComplete]);

  useEffect(() => {
    if (!hydrationComplete) return;
    localStorage.setItem("sqllab_active_tab", activeTabId);
  }, [activeTabId, hydrationComplete]);

  useEffect(() => {
    if (!hydrationComplete) return;
    flushPersistence();
  }, [activeTabId, flushPersistence, hydrationComplete]);

  useEffect(() => {
    const flush = () => flushPersistence();
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      flushPersistence();
    };
  }, [flushPersistence]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId],
  );

  const setActiveTabIdAndFlush = useCallback(
    (nextActiveTabId: string | ((current: string) => string)) => {
      flushPersistence();
      setActiveTabId(nextActiveTabId);
    },
    [flushPersistence],
  );

  const addTab = useCallback((selectedDS: string, selectedSchema: string) => {
    const newId = Math.random().toString(36).substring(7);
    setTabs((prev) => {
      const newTab: QueryTab = {
        id: newId,
        name: `SQL-${prev.length + 1}`,
        sql: "",
        selectedDS,
        selectedSchema,
        results: [],
        columns: [],
        error: null,
      };
      return [...prev, newTab];
    });
    setActiveTabIdAndFlush(newId);
  }, [setActiveTabIdAndFlush]);

  const closeTab = useCallback((id: string) => {
    flushPersistence();
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const newTabs = prev.filter((t) => t.id !== id);
      setActiveTabId((prevActiveId) => {
        if (prevActiveId === id) {
          return newTabs[newTabs.length - 1].id;
        }
        return prevActiveId;
      });
      return newTabs;
    });
  }, [flushPersistence]);

  const renameTab = useCallback((id: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t)),
    );
  }, []);

  const updateActiveTab = useCallback(
    (updates: Partial<QueryTab>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)),
      );
    },
    [activeTabId],
  );

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId: setActiveTabIdAndFlush,
    activeTab,
    addTab,
    closeTab,
    renameTab,
    updateActiveTab,
  };
}

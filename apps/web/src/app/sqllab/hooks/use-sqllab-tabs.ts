/**
 * @file use-sqllab-tabs.ts
 * @description Hook to manage SQL Lab query tabs and their persistence.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

export interface QueryTab {
  id: string;
  name: string;
  sql: string;
  selectedDS: string;
  selectedSchema: string;
  results: Record<string, unknown>[];
  columns: any[];
  error: string | null;
}

export function useSQLLabTabs() {
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: "1",
      name: "SQL-1",
      sql: 'SELECT * FROM "databases" LIMIT 10;',
      selectedDS: "",
      selectedSchema: "",
      results: [],
      columns: [],
      error: null,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");

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
  }, []);

  useEffect(() => {
    localStorage.setItem("sqllab_tabs", JSON.stringify(tabs));
    localStorage.setItem("sqllab_active_tab", activeTabId);
  }, [tabs, activeTabId]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId],
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
    setActiveTabId(newId);
  }, []);

  const closeTab = useCallback((id: string) => {
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
  }, []);

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
    setActiveTabId,
    activeTab,
    addTab,
    closeTab,
    renameTab,
    updateActiveTab,
  };
}

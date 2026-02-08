/**
 * @file use-sqllab-tabs.ts
 * @description Hook to manage SQL Lab query tabs and their persistence.
 */

import { useState, useEffect } from "react";

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

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const addTab = (selectedDS: string, selectedSchema: string) => {
    const newId = Math.random().toString(36).substring(7);
    const newTab: QueryTab = {
      id: newId,
      name: `SQL-${tabs.length + 1}`,
      sql: "",
      selectedDS,
      selectedSchema,
      results: [],
      columns: [],
      error: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const renameTab = (id: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t)),
    );
  };

  const updateActiveTab = (updates: Partial<QueryTab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)),
    );
  };

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

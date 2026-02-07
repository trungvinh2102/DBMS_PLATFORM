/**
 * @file useSQLLab.ts
 * @description Custom hook to manage the state and logic for the SQLLab page.
 * Handles database connections, query execution, formatting, and history invalidation.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { format } from "sql-formatter";
import { queryClient } from "@/utils/trpc";
import { useSearchParams } from "next/navigation";

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

export function useSQLLab() {
  const searchParams = useSearchParams();
  const initialConnectionId = searchParams.get("connectionId");

  // Tabs State
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

  // Load from localStorage
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
        console.error("Failed to load tabs from local storage", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("sqllab_tabs", JSON.stringify(tabs));
    localStorage.setItem("sqllab_active_tab", activeTabId);
  }, [tabs, activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Derived State (compat with existing components)
  const sql = activeTab.sql;
  const setSql = (newSql: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, sql: newSql } : t)),
    );
  };

  const selectedDS = activeTab.selectedDS;
  const setSelectedDS = (dsId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, selectedDS: dsId } : t)),
    );
  };

  const selectedSchema = activeTab.selectedSchema;
  const setSelectedSchema = (schema: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, selectedSchema: schema } : t,
      ),
    );
  };

  const [activeRightTab, setActiveRightTab] = useState("data");
  const [rightPanelMode, setRightPanelMode] = useState<"object" | "history">(
    "object",
  );
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [autoCommit, setAutoCommit] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [cursorPos, setCursorPos] = useState({ lineNumber: 1, column: 1 });
  const [tabSize, setTabSize] = useState(4);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(false);

  // Queries
  const { data: dsData } = useQuery(trpc.database.listDatabases.queryOptions());
  const dataSources =
    (dsData as unknown as import("@/lib/types").DataSource[]) || [];

  const {
    data: schemasData,
    isLoading: isLoadingSchemas,
    error: schemasError,
  } = useQuery({
    ...trpc.database.getSchemas.queryOptions({
      databaseId: selectedDS,
    }),
    enabled: !!selectedDS,
  });
  const schemas = (schemasData as string[]) || [];

  const {
    data: tables,
    isLoading: isLoadingTables,
    refetch: refetchTables,
    error: tablesError,
  } = useQuery({
    ...trpc.database.getTables.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: views } = useQuery({
    ...trpc.database.getViews.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: functions } = useQuery({
    ...trpc.database.getFunctions.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: procedures } = useQuery({
    ...trpc.database.getProcedures.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: triggers } = useQuery({
    ...trpc.database.getTriggers.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: events } = useQuery({
    ...trpc.database.getEvents.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: allColumns, error: allColumnsError } = useQuery({
    ...trpc.database.getAllColumns.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const {
    data: columnsData,
    isLoading: isLoadingColumns,
    error: columnsError,
  } = useQuery({
    ...trpc.database.getColumns.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
      table: selectedTable || "",
    }),
    enabled: !!selectedDS && !!selectedTable,
  });

  // Toast errors for metadata queries
  useEffect(() => {
    const error =
      schemasError || tablesError || allColumnsError || columnsError;
    if (error) {
      toast.error(
        (error as any).message || "Failed to fetch database metadata",
      );
    }
  }, [schemasError, tablesError, allColumnsError, columnsError]);

  const { data: savedQueries, refetch: refetchSavedQueries } = useQuery({
    ...trpc.database.listSavedQueries.queryOptions({
      databaseId: selectedDS,
    }),
    enabled: !!selectedDS,
  });

  // Mutations
  const tableDataMutation = useMutation(
    trpc.database.execute.mutationOptions(),
  );
  const runSQLMutation = useMutation(trpc.database.execute.mutationOptions());
  const saveQueryMutation = useMutation(
    trpc.database.saveQuery.mutationOptions(),
  );

  // Effects
  useEffect(() => {
    if (selectedTable && selectedDS && activeRightTab === "data") {
      tableDataMutation.mutate({
        databaseId: selectedDS,
        sql: `SELECT * FROM "${selectedTable}" LIMIT 100`,
      });
    }
  }, [selectedTable, selectedDS, activeRightTab, tableDataMutation.mutate]);

  useEffect(() => {
    // Check if we need to select a DS based on URL or default
    if (dataSources.length > 0) {
      if (initialConnectionId) {
        const target = dataSources.find((d) => d.id === initialConnectionId);
        if (target) {
          setSelectedDS(target.id);
          return;
        }
      }

      // Fallback to first if nothing selected
      if (!selectedDS) {
        const firstId = dataSources[0].id;
        setSelectedDS(firstId);
      }
    }
  }, [dataSources, selectedDS, initialConnectionId]);

  useEffect(() => {
    if (schemas.length > 0) {
      // If current selectedSchema is not in the list, or empty, select the first one
      if (!selectedSchema || !schemas.includes(selectedSchema)) {
        const defaultSchema = schemas.includes("public")
          ? "public"
          : schemas[0];
        setSelectedSchema(defaultSchema);
      }
    }
  }, [schemas, selectedSchema]);

  // Handlers
  const handleRun = useCallback(async () => {
    let targetDS = selectedDS;

    if (!targetDS && dataSources.length > 0) {
      targetDS = dataSources[0].id;
      setSelectedDS(targetDS);
    }

    if (!targetDS) {
      toast.error("Please connect a database first.");
      return;
    }

    try {
      const response = await runSQLMutation.mutateAsync({
        databaseId: targetDS,
        sql: sql,
      });

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                results: response.data || [],
                columns: response.columns || [],
                error: response.error || null,
              }
            : t,
        ),
      );

      // Error is stored in tab state and displayed in Messages tab
      // Success just shows results in Results tab, no toast needed
    } catch (error: any) {
      // Store error in tab state for Messages tab
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, error: error.message || "Failed to execute query" }
            : t,
        ),
      );
    } finally {
      queryClient.invalidateQueries({
        queryKey: trpc.database.getQueryHistory.queryKey({
          databaseId: targetDS,
        }),
      });
    }
  }, [selectedDS, sql, runSQLMutation, dataSources, activeTabId]);

  const handleFormat = useCallback(() => {
    try {
      const formatted = format(sql, { language: "postgresql" });
      setSql(formatted);
    } catch (e) {
      toast.error("Failed to format SQL");
    }
  }, [sql, setSql]);

  const handleStop = useCallback(() => {
    if (runSQLMutation.isPending) {
      runSQLMutation.reset();
      toast.info("Query execution stopped");
    }
  }, [runSQLMutation]);

  const handleUndo = useCallback(() => {
    setUndoTrigger((prev) => prev + 1);
  }, []);

  const handleRedo = useCallback(() => {
    setRedoTrigger((prev) => prev + 1);
  }, []);

  // Tab Actions
  const addTab = () => {
    const newId = Math.random().toString(36).substring(7);
    const newTab: QueryTab = {
      id: newId,
      name: `SQL-${tabs.length + 1}`,
      sql: "",
      selectedDS: selectedDS, // Carry over current DS
      selectedSchema: selectedSchema,
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

  const handleSave = useCallback(() => {
    setIsSaveDialogOpen(true);
  }, []);

  const handleSaveConfirmed = useCallback(
    async (name: string, description?: string) => {
      if (!selectedDS) {
        toast.error("Please select a database first");
        return;
      }

      try {
        await saveQueryMutation.mutateAsync({
          name,
          description,
          sql,
          databaseId: selectedDS,
        });
        toast.success(`Query "${name}" saved successfully`);
        setIsSaveDialogOpen(false);
        refetchSavedQueries();
      } catch (e: any) {
        toast.error(e.message || "Failed to save query");
      }
    },
    [selectedDS, sql, saveQueryMutation, refetchSavedQueries],
  );

  const handleOpen = useCallback(() => {
    setIsOpenDialogOpen(true);
  }, []);

  const handleSelectSavedQuery = useCallback(
    (savedQuery: any) => {
      // Add or replace current tab content
      setSql(savedQuery.sql);
      setSelectedDS(savedQuery.databaseId);
      renameTab(activeTabId, savedQuery.name);
      setIsOpenDialogOpen(false);
      toast.success(`Loaded "${savedQuery.name}"`);
    },
    [setSql, setSelectedDS, renameTab, activeTabId],
  );

  const handleExport = useCallback(() => {
    if (!activeTab.results || activeTab.results.length === 0) {
      toast.error("No results to export");
      return;
    }

    try {
      const cols = activeTab.columns;
      const csvContent = [
        cols.join(","),
        ...(activeTab.results as any[]).map((row: any) =>
          cols
            .map((col: string) => {
              const val = row[col];
              return typeof val === "string" ? `"${val}"` : val;
            })
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${activeTab.name}_results.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Results exported to CSV");
    } catch (e) {
      toast.error("Failed to export results");
    }
  }, [activeTab]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sql";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const content = event.target.result;
          const newId = Math.random().toString(36).substring(7);
          const newTab: QueryTab = {
            id: newId,
            name: file.name.replace(".sql", ""),
            sql: content,
            selectedDS: selectedDS,
            selectedSchema: selectedSchema,
            results: [],
            columns: [],
            error: null,
          };
          setTabs((prev) => [...prev, newTab]);
          setActiveTabId(newId);
          toast.success(`Imported ${file.name}`);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [selectedDS, selectedSchema]);

  // Use refs for handlers in global listeners to avoid re-binding on every keystroke
  const handleRunRef = useRef(handleRun);
  const handleStopRef = useRef(handleStop);

  useEffect(() => {
    handleRunRef.current = handleRun;
    handleStopRef.current = handleStop;
  }, [handleRun, handleStop]);

  // Global Keydown Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunRef.current();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "x"
      ) {
        e.preventDefault();
        handleStopRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty dependency array means this only runs once

  // Computed Values
  const executing = runSQLMutation.isPending;
  const currentTData = tableDataMutation.data?.data || [];
  const currentTColumns = tableDataMutation.data?.columns || [];
  const loadingTData = tableDataMutation.isPending;
  const selectedDSName =
    dataSources.find((ds) => ds.id === selectedDS)?.name || "";

  return {
    // State
    tabs,
    activeTabId,
    setActiveTabId,
    sql,
    setSql,
    activeRightTab,
    setActiveRightTab,
    rightPanelMode,
    setRightPanelMode,
    selectedDS,
    setSelectedDS,
    selectedSchema,
    setSelectedSchema,
    selectedTable,
    setSelectedTable,
    autoCommit,
    setAutoCommit,
    showRightPanel,
    setShowRightPanel,
    cursorPos,
    setCursorPos,
    tabSize,
    setTabSize,
    undoTrigger,
    redoTrigger,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    isOpenDialogOpen,
    setIsOpenDialogOpen,
    showAISidebar,
    setShowAISidebar,

    // Data
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    views: (views as string[]) || [],
    functions: (functions as string[]) || [],
    procedures: (procedures as string[]) || [],
    triggers: (triggers as string[]) || [],
    events: (events as string[]) || [],
    isLoadingTables,
    columnsData,
    allColumns: allColumns || [],
    isLoadingColumns,
    results: activeTab.results,
    columns: activeTab.columns,
    executing,
    error: activeTab.error,
    currentTData,
    currentTColumns,
    loadingTData,
    selectedDSName,
    executionTime: tableDataMutation.data?.executionTime,

    // Actions
    handleRun,
    handleFormat,
    handleStop,
    handleUndo,
    handleRedo,
    handleSave,
    handleSaveConfirmed,
    handleOpen,
    handleSelectSavedQuery,
    savedQueries: (savedQueries as unknown as any[]) || [],
    refetchTables,
    addTab,
    closeTab,
    renameTab,
    handleImport,
    handleExport,
  };
}

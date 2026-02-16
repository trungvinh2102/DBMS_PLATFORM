import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useSQLLabTabs } from "./use-sqllab-tabs";
import { useSQLLabMetadata } from "./use-sqllab-metadata";
import { useSQLLabQuery } from "./use-sqllab-query";

export function useSQLLab() {
  const searchParams = useSearchParams();
  const initialConnectionId =
    searchParams.get("connectionId") || searchParams.get("ds");

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    addTab,
    closeTab,
    renameTab,
    updateActiveTab,
  } = useSQLLabTabs();

  // Basic UI States
  const [activeRightTab, setActiveRightTab] = useState("data");
  const [activeResultTab, setActiveResultTab] = useState<
    "results" | "messages" | "problems"
  >("results");
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
  const [selectedText, setSelectedText] = useState<string>("");

  const {
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    refetchTables,
    isLoadingTables,
    allColumns,
    indexes,
    foreignKeys,
    tableInfo,
    tableDDL,
    refetchAll,
    ...metadata
  } = useSQLLabMetadata({
    selectedDS: activeTab.selectedDS,
    selectedSchema: activeTab.selectedSchema,
    selectedTable,
  });

  const {
    handleRun,
    handleFormat,
    handleStop,
    executing,
    runSQLMutation,
    saveQueryMutation,
    savedQueries,
    refetchSavedQueries,
  } = useSQLLabQuery({
    selectedDS: activeTab.selectedDS,
    sql: activeTab.sql,
    onSuccess: (res: any) => {
      // Adapt response shape if needed
      updateActiveTab({
        results: res.data || [],
        columns: res.columns || [],
        error: res.error || null,
      });
      // Switch to results tab on success
      setActiveResultTab("results");
    },
    onError: (err) => {
      updateActiveTab({ error: err });
      // Switch to messages tab on error
      setActiveResultTab("messages");
    },
  });

  // Data Source initialization
  useEffect(() => {
    const ds = dataSources as unknown as any[];
    if (ds && ds.length > 0) {
      if (initialConnectionId) {
        const target = ds.find((d: any) => d.id === initialConnectionId);
        if (target && activeTab.selectedDS !== target.id) {
          updateActiveTab({ selectedDS: target.id });
          return;
        }
      }
      if (!activeTab.selectedDS) {
        updateActiveTab({ selectedDS: ds[0].id });
      }
    }
  }, [dataSources, initialConnectionId, activeTab.selectedDS, updateActiveTab]);

  // Schema initialization
  useEffect(() => {
    const s = schemas as unknown as string[];
    if (s && s.length > 0) {
      if (!activeTab.selectedSchema || !s.includes(activeTab.selectedSchema)) {
        const def = s.includes("public") ? "public" : s[0];
        if (activeTab.selectedSchema !== def) {
          updateActiveTab({ selectedSchema: def });
        }
      }
    }
  }, [schemas, activeTab.selectedSchema, updateActiveTab]);

  const tableDataMutation = useMutation({
    mutationFn: (vars: { databaseId: string; sql: string }) =>
      databaseApi.execute(vars.databaseId, vars.sql),
  });

  useEffect(() => {
    if (selectedTable && activeTab.selectedDS && activeRightTab === "data") {
      tableDataMutation.mutate({
        databaseId: activeTab.selectedDS,
        sql: `SELECT * FROM "${selectedTable}" LIMIT 100`,
      });
    }
  }, [selectedTable, activeTab.selectedDS, activeRightTab]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    sql: activeTab.sql,
    setSql: (sql: string) => updateActiveTab({ sql }),
    activeRightTab,
    setActiveRightTab,
    activeResultTab,
    setActiveResultTab,
    rightPanelMode,
    setRightPanelMode,
    selectedDS: activeTab.selectedDS,
    setSelectedDS: (ds: string) => updateActiveTab({ selectedDS: ds }),
    selectedSchema: activeTab.selectedSchema,
    setSelectedSchema: (sc: string) => updateActiveTab({ selectedSchema: sc }),
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
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    ...metadata,
    refetchTables,
    isLoadingTables,
    allColumns,
    results: activeTab.results,
    columns: activeTab.columns,
    executing,
    error: activeTab.error,
    currentTData: (tableDataMutation.data as any)?.data || [],
    currentTColumns: (tableDataMutation.data as any)?.columns || [],
    loadingTData: tableDataMutation.isPending,
    columnsData: allColumns,
    isLoadingColumns: isLoadingSchemas || isLoadingTables,
    indexes,
    foreignKeys,
    tableInfo,
    tableDDL,
    executionTime: (runSQLMutation as any).data?.executionTime || 0,
    selectedDSName:
      dataSources.find((ds) => ds.id === activeTab.selectedDS)?.databaseName ||
      "",
    handleRun: (sqlOverride?: string | React.SyntheticEvent) => {
      const actualSql =
        typeof sqlOverride === "string" ? sqlOverride : undefined;
      return handleRun(actualSql || selectedText || undefined);
    },
    handleFormat: () =>
      handleFormat(activeTab.sql, (s: string) => updateActiveTab({ sql: s })),
    setSelectedText,
    handleStop,
    handleSave: () => setIsSaveDialogOpen(true),
    handleOpen: () => setIsOpenDialogOpen(true),
    handleUndo: () => setUndoTrigger((v) => v + 1),
    handleRedo: () => setRedoTrigger((v) => v + 1),
    handleImport: () => toast.info("Import feature coming soon"),
    handleExport: () => toast.info("Export feature coming soon"),
    addTab: () => addTab(activeTab.selectedDS, activeTab.selectedSchema),
    closeTab,
    renameTab,
    savedQueries,
    refetchSavedQueries,
    handleSaveConfirmed: async (name: string, desc?: string) => {
      try {
        await saveQueryMutation.mutateAsync({
          name,
          description: desc,
          sql: activeTab.sql,
          databaseId: activeTab.selectedDS,
        });
        toast.success(`Query "${name}" saved`);
        setIsSaveDialogOpen(false);
        refetchSavedQueries();
      } catch (e: any) {
        toast.error(e.message || "Failed to save query");
      }
    },
    handleSelectSavedQuery: (q: any) => {
      updateActiveTab({ sql: q.sql, selectedDS: q.databaseId });
      renameTab(activeTabId, q.name);
      setIsOpenDialogOpen(false);
    },
  };
}

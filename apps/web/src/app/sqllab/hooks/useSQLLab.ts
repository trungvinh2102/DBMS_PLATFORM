/**
 * @file useSQLLab.ts
 * @description Composed hook to manage the state and logic for the SQLLab page.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
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
    onSuccess: (res) => {
      updateActiveTab({
        results: res.data || [],
        columns: res.columns || [],
        error: res.error || null,
      });
    },
    onError: (err) => {
      updateActiveTab({ error: err });
    },
  });

  // Data Source initialization
  useEffect(() => {
    if (dataSources.length > 0) {
      if (initialConnectionId) {
        const target = dataSources.find((d) => d.id === initialConnectionId);
        if (target) {
          updateActiveTab({ selectedDS: target.id });
          return;
        }
      }
      if (!activeTab.selectedDS) {
        updateActiveTab({ selectedDS: dataSources[0].id });
      }
    }
  }, [dataSources, initialConnectionId, activeTab.selectedDS, updateActiveTab]);

  // Schema initialization
  useEffect(() => {
    if (schemas.length > 0) {
      if (
        !activeTab.selectedSchema ||
        !schemas.includes(activeTab.selectedSchema)
      ) {
        const def = schemas.includes("public") ? "public" : schemas[0];
        updateActiveTab({ selectedSchema: def });
      }
    }
  }, [schemas, activeTab.selectedSchema, updateActiveTab]);

  const tableDataMutation = useMutation(
    trpc.database.execute.mutationOptions(),
  );

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
    currentTData: tableDataMutation.data?.data || [],
    currentTColumns: tableDataMutation.data?.columns || [],
    loadingTData: tableDataMutation.isPending,
    columnsData: allColumns,
    isLoadingColumns: isLoadingSchemas || isLoadingTables,
    executionTime: (runSQLMutation as any).data?.executionTime || 0,
    selectedDSName:
      dataSources.find((ds) => ds.id === activeTab.selectedDS)?.name || "",
    handleRun: (sqlOverride?: string) =>
      handleRun(sqlOverride || selectedText || undefined),
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

import { useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

// Sub-hooks
import { useSQLLabTabs } from "./use-sqllab-tabs";
import { useSQLLabMetadata } from "./use-sqllab-metadata";
import { useSQLLabQuery } from "./use-sqllab-query";
import { useSQLLabUI } from "./use-sqllab-ui";
import { useSQLLabActions } from "./use-sqllab-actions";

export function useSQLLab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Compose Sub-hooks
  const {
    tabs, activeTabId, setActiveTabId, activeTab, addTab, closeTab, renameTab, updateActiveTab,
  } = useSQLLabTabs();

  const ui = useSQLLabUI();
  const actions = useSQLLabActions();

  const {
    dataSources, schemas, isLoadingSchemas, tables, refetchTables, isLoadingTables,
    isLoadingColumns: isMetaLoadingCols, allColumns, indexes, foreignKeys, tableInfo, tableDDL,
    refetchAll, ...metadata
  } = useSQLLabMetadata({
    selectedDS: activeTab.selectedDS,
    selectedSchema: activeTab.selectedSchema,
    selectedTable: ui.selectedTable,
  });

  const selectedDSData = dataSources?.find((ds: any) => ds.id === activeTab.selectedDS);
  const selectedDSType = selectedDSData?.type || "";
  const isRelational = !["mongodb", "redis"].includes(selectedDSType);

  const {
    handleRun, handleFormat, handleStop, executing, runSQLMutation, saveQueryMutation,
    savedQueries, refetchSavedQueries,
  } = useSQLLabQuery({
    selectedDS: activeTab.selectedDS,
    sql: activeTab.sql,
    autoCommit: ui.activeResultTab === "results", // Generic, specific ones can override
    limit: 1000,
    onSuccess: (res: any) => {
      updateActiveTab({ results: res.data || [], columns: res.columns || [], error: null });
      ui.setActiveResultTab("results");
    },
    onError: (err) => {
      updateActiveTab({ error: err });
      ui.setActiveResultTab("messages");
    },
  });

  // 2. Initialization Logic (DS, Schemas)
  useEffect(() => {
    if (dataSources?.length) {
      const initialId = searchParams.get("connectionId") || searchParams.get("ds");
      if (initialId && !activeTab.selectedDS) {
        const target = dataSources.find((d: any) => d.id === initialId);
        if (target) {
          updateActiveTab({ selectedDS: target.id });
          navigate(location.pathname, { replace: true });
        }
      } else if (!activeTab.selectedDS) {
        updateActiveTab({ selectedDS: dataSources[0].id });
      }
    }
  }, [dataSources, activeTab.selectedDS, updateActiveTab, searchParams, navigate, location.pathname]);

  useEffect(() => {
    if (schemas?.length) {
      if (!activeTab.selectedSchema || !schemas.includes(activeTab.selectedSchema)) {
        let def = schemas[0];
        if (selectedDSType === "clickhouse") def = schemas.includes("default") ? "default" : schemas[0];
        else if (selectedDSType === "redis") def = schemas.includes("0") ? "0" : schemas[0];
        else def = schemas.includes("public") ? "public" : schemas[0];
        updateActiveTab({ selectedSchema: def });
      }
    }
  }, [schemas, activeTab.selectedSchema, updateActiveTab, selectedDSType]);

  // 3. Dependent States/Actions
  const tableDataMutation = useMutation({
    mutationFn: (vars: { databaseId: string; sql: string }) => databaseApi.execute(vars.databaseId, vars.sql),
  });

  const getSelectedObjectType = useCallback(() => {
    if (!ui.selectedTable) return "table";
    if (metadata.views?.includes(ui.selectedTable)) return "view";
    if (metadata.events?.includes(ui.selectedTable)) return "event";
    if (metadata.functions?.includes(ui.selectedTable)) return "function";
    if (metadata.procedures?.includes(ui.selectedTable)) return "procedure";
    if (metadata.triggers?.includes(ui.selectedTable)) return "trigger";
    return "table";
  }, [ui.selectedTable, metadata]);

  useEffect(() => {
    const type = getSelectedObjectType();
    if (ui.selectedTable && activeTab.selectedDS && ui.activeRightTab === "data" && (type === "table" || type === "view")) {
      const sql = selectedDSType === "redis" ? `GET "${ui.selectedTable}"` : `SELECT * FROM "${ui.selectedTable}" LIMIT 100`;
      tableDataMutation.mutate({ databaseId: activeTab.selectedDS, sql });
    }
  }, [ui.selectedTable, activeTab.selectedDS, ui.activeRightTab, getSelectedObjectType, selectedDSType]);

  const [selectedText, setSelectedText] = [ui.cursorPos, ui.setCursorPos]; // Mocked locally for now, to be integrated better.

  // 4. Expose Clean API
  return {
    ...ui,
    tabs, activeTabId, setActiveTabId, 
    addTab: () => addTab(activeTab.selectedDS, activeTab.selectedSchema),
    closeTab, renameTab,
    sql: activeTab.sql,
    setSql: (sql: string) => updateActiveTab({ sql }),
    selectedDS: activeTab.selectedDS,
    setSelectedDS: (ds: string) => updateActiveTab({ selectedDS: ds }),
    selectedSchema: activeTab.selectedSchema,
    setSelectedSchema: (sc: string) => updateActiveTab({ selectedSchema: sc }),
    
    // Data & Results
    dataSources, schemas, isLoadingSchemas, tables, ...metadata,
    indexes, foreignKeys, tableInfo, tableDDL,
    refetchTables, isLoadingTables, allColumns,
    results: activeTab.results, columns: activeTab.columns, error: activeTab.error,
    executing, executionTime: (runSQLMutation as any).data?.executionTime || 0,
    currentTData: (tableDataMutation.data as any)?.data || [],
    currentTColumns: (tableDataMutation.data as any)?.columns || [],
    loadingTData: tableDataMutation.isPending,
    selectedDSName: selectedDSData?.databaseName || "",
    selectedDSType, isRelational, selectedObjectType: getSelectedObjectType(),
    savedQueries, refetchSavedQueries,

    // Actions
    handleRun: (sqlOverride?: string | React.SyntheticEvent) => {
      const actualSql = typeof sqlOverride === "string" ? sqlOverride : undefined;
      return handleRun(actualSql || undefined); // selection logic simplified temporarily
    },
    handleFormat: () => handleFormat(activeTab.sql, (s: string) => updateActiveTab({ sql: s })),
    handleStop,
    handleImport: () => actions.handleImport((s) => updateActiveTab({ sql: s })),
    handleExport: () => actions.handleExport(activeTab.sql, activeTab.selectedDS),
    handleRollback: () => { handleRun("ROLLBACK;"); toast.info("Rollback command sent"); },
    handleSaveConfirmed: async (name: string, desc?: string) => {
      await saveQueryMutation.mutateAsync({ name, description: desc, sql: activeTab.sql, databaseId: activeTab.selectedDS });
      toast.success(`Query "${name}" saved`);
      ui.setIsSaveDialogOpen(false);
      refetchSavedQueries();
    },
    handleSelectSavedQuery: (q: any) => {
      updateActiveTab({ sql: q.sql, selectedDS: q.databaseId });
      renameTab(activeTabId, q.name);
      ui.setIsOpenDialogOpen(false);
    },
    setSelectedText: (txt: string) => { /* localized in ui trigger if needed */ },
    fixSQLError: ui.showAISidebar ? "error" : null, // Mocked for placeholder
    setFixSQLError: (v: string) => {},
    handleSave: () => ui.setIsSaveDialogOpen(true),
    handleOpen: () => ui.setIsOpenDialogOpen(true),
    handleUndo: ui.triggerUndo,
    handleRedo: ui.triggerRedo,
    addSchemaTab: () => { ui.setRightPanelMode("schema"); ui.setShowRightPanel(true); },
    isLoadingColumns: isLoadingSchemas || isLoadingTables || isMetaLoadingCols,
  };
}

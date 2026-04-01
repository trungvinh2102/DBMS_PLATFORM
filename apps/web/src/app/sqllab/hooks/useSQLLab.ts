/**
 * @file useSQLLab.ts
 * @description Master composition hook for SQL Lab, integrating state management, query execution, and metadata retrieval.
 */

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
import { useSettingsStore } from "@/stores/use-settings-store";

export function useSQLLab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettingsStore();

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

  useEffect(() => {
    if (ui.rightPanelMode === "schema" && (!isRelational || selectedDSType === "clickhouse")) {
      ui.setShowRightPanel(false);
      ui.setRightPanelMode("object");
    }
  }, [isRelational, selectedDSType, ui.rightPanelMode, ui]);

  const {
    handleRun, handleExplain, handleFormat, handleStop, executing, runSQLMutation, explainSQLMutation, saveQueryMutation,
    savedQueries, refetchSavedQueries,
  } = useSQLLabQuery({
    selectedDS: activeTab.selectedDS,
    sql: activeTab.sql,
    autoCommit: ui.activeResultTab === "results", // Generic, specific ones can override
    limit: settings.defaultQueryLimit,
    onSuccess: (res: any) => {
      updateActiveTab({
        results: res.isExplain ? res : (res.data || []),
        columns: res.columns || [],
        error: res.error || null,
      });
      if (res.error) {
        ui.setActiveResultTab("messages");
        toast.error("Execution failed. Check messages for details.");
      } else {
        ui.setActiveResultTab("results");
        toast.success("Query executed successfully");
      }
    },
    onError: (err) => {
      updateActiveTab({ error: err });
      ui.setActiveResultTab("messages");
      toast.error("Network or execution error. Check details.");
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

  const lastExecutedSql = (tableDataMutation.variables as any)?.sql;

  useEffect(() => {
    const type = getSelectedObjectType();
    if (
      ui.selectedTable && 
      activeTab.selectedDS && 
      ui.activeRightTab === "data" && 
      (type === "table" || type === "view")
    ) {
      let sql = `SELECT * FROM "${ui.selectedTable}" LIMIT 100`;
      if (selectedDSType === "redis") sql = `GET "${ui.selectedTable}"`;
      else if (selectedDSType === "mongodb") {
        const dbPrefix = (activeTab.selectedSchema && activeTab.selectedSchema !== "public") ? activeTab.selectedSchema : "db";
        sql = `${dbPrefix}.${ui.selectedTable}.find()`;
      }
      
      // Only mutate if SQL changed and not already fetching
      if (sql !== lastExecutedSql && !tableDataMutation.isPending) {
        tableDataMutation.mutate({ databaseId: activeTab.selectedDS, sql });
      }
    }
  }, [ui.selectedTable, activeTab.selectedDS, ui.activeRightTab, getSelectedObjectType, selectedDSType, activeTab.selectedSchema, lastExecutedSql]);

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
    resultEncoding: settings.resultEncoding,
    
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
      updateActiveTab({ error: null });
      return handleRun(actualSql || undefined);
    },
    handleExplain: (sqlOverride?: string | React.SyntheticEvent) => {
      const actualSql = typeof sqlOverride === "string" ? sqlOverride : undefined;
      updateActiveTab({ error: null });
      return handleExplain(actualSql || undefined);
    },
    handleFormat: () => handleFormat(activeTab.sql, (s: string) => updateActiveTab({ sql: s })),
    handleStop,
    handleImport: () => actions.handleImport((s) => updateActiveTab({ sql: s })),
    handleExport: () => actions.handleExport(activeTab.sql, activeTab.selectedDS),
    handleRollback: () => { handleRun("ROLLBACK;"); toast.info("Rollback command sent"); },
    handleSaveConfirmed: async (name: string, desc?: string) => {
      let finalSql = activeTab.sql;
      if (settings.editorFormatOnSave) {
        // We reuse handleFormat logic but synchronously if possible or just call it
        // Since sql-formatter is used in useSQLLabQuery, we can manually call it if we want,
        // but it's better to stay consistent.
        try {
          const { format } = await import("sql-formatter");
          finalSql = format(activeTab.sql, { language: "postgresql" });
          updateActiveTab({ sql: finalSql });
        } catch (e) {
          console.warn("Format on save failed:", e);
        }
      }
      await saveQueryMutation.mutateAsync({ name, description: desc, sql: finalSql, databaseId: activeTab.selectedDS });
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
    fixSQLError: ui.fixSQLError,
    setFixSQLError: (v: string | null) => {
      ui.setFixSQLError(v);
      if (v) {
        ui.setShowAISidebar(true);
        ui.setShowRightPanel(false);
      }
    },
    handleSave: () => ui.setIsSaveDialogOpen(true),
    handleOpen: () => ui.setIsOpenDialogOpen(true),
    handleUndo: ui.triggerUndo,
    handleRedo: ui.triggerRedo,
    addSchemaTab: () => { ui.setRightPanelMode("schema"); ui.setShowRightPanel(true); },
    handleUpdateData: async (pendingChanges: Record<number, any>) => {
      const table = ui.selectedTable;
      const schema = activeTab.selectedSchema;
      const dsId = activeTab.selectedDS;
      
      if (!table || !dsId) return;

      const currentData = (tableDataMutation.data as any)?.data || [];
      // Identify unique identification columns: Primary keys or all columns as fallback
      let keyColumns = allColumns.filter((c: any) => c.primary_key).map((c: any) => c.name);
      let isFallback = false;

      if (keyColumns.length === 0) {
        keyColumns = allColumns.map((c: any) => c.name);
        isFallback = true;
        if (keyColumns.length > 0) {
          toast.warning("Table has no primary key. Using all columns for row identification. Multiple identical rows might be affected.", { duration: 6000 });
        }
      }

      if (keyColumns.length === 0) {
        toast.error("Cannot update table: No columns found for identification");
        return;
      }

      const updates: string[] = [];
      const rowIndices = Object.keys(pendingChanges).map(Number);
      
      for (const rowIndex of rowIndices) {
        const changes = pendingChanges[rowIndex];
        const originalRow = currentData[rowIndex];
        
        const setClauses = Object.entries(changes)
          .filter(([col, val]) => val !== originalRow[col])
          .map(([col, val]) => {
            if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return `"${col}" = NULL`;
            const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
            return `"${col}" = ${escapedVal}`;
          });

        if (setClauses.length === 0) continue;

        const whereClauses = keyColumns.map(k => {
          const val = originalRow[k];
          if (val === null || val === undefined) return `"${k}" IS NULL`;
          const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
          return `"${k}" = ${escapedVal}`;
        });

        updates.push(`UPDATE "${schema}"."${table}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`);
      }

      if (updates.length > 0) {
        try {
          // Execute updates sequentially to be safe
          for (const sql of updates) {
            await databaseApi.execute(dsId, sql);
          }
          toast.success(`Successfully updated ${updates.length} rows`);
          // Refresh data
          tableDataMutation.mutate({ 
            databaseId: dsId, 
            sql: selectedDSType === "mongodb" ? `${schema || 'db'}.${table}.find()` : `SELECT * FROM "${table}" LIMIT 100` 
          });
        } catch (err: any) {
          toast.error(`Update failed: ${err.message}`);
        }
      }
    },
    isLoadingColumns: isLoadingSchemas || isLoadingTables || isMetaLoadingCols,
  };
}

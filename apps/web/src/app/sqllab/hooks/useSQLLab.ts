/**
 * @file useSQLLab.ts
 * @description Master composition hook for SQL Lab, integrating state management, query execution, and metadata retrieval.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

// Sub-hooks
import { useSQLLabTabs } from "./use-sqllab-tabs";
import type { QueryTab } from "./use-sqllab-tabs";
import { useSQLLabMetadata } from "./use-sqllab-metadata";
import { useSQLLabQuery } from "./use-sqllab-query";
import { useSQLLabUI } from "./use-sqllab-ui";
import { useSQLLabActions } from "./use-sqllab-actions";
import { useSettingsStore } from "@/stores/use-settings-store";
import type { EditorSelection, EditorSelectionMeta } from "../types";
import type { SQLKeyboardSelection } from "@/lib/monaco/MonacoEditor";

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
    isLoadingColumns: isMetaLoadingCols, allColumns, autocompleteColumns, indexes, foreignKeys, tableInfo, tableDDL,
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
    autoCommit: ui.autoCommit,
    limit: ui.queryLimit,
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

  const saveActiveSavedQuery = useCallback(async (contentOverride?: string) => {
    if (!activeTab.savedQueryId) return;
    if (!activeTab.selectedDS) return;

    await saveQueryMutation.mutateAsync({
      id: activeTab.savedQueryId,
      name: activeTab.name,
      sql: contentOverride ?? activeTab.sql,
      databaseId: activeTab.selectedDS,
    });
    refetchSavedQueries();
  }, [
    activeTab.name,
    activeTab.savedQueryId,
    activeTab.selectedDS,
    activeTab.sql,
    refetchSavedQueries,
    saveQueryMutation,
  ]);

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
        if (["sqlite", "duckdb"].includes(selectedDSType)) def = schemas.includes("main") ? "main" : schemas[0];
        else if (selectedDSType === "clickhouse") def = schemas.includes("default") ? "default" : schemas[0];
        else if (selectedDSType === "redis") def = schemas.includes("0") ? "0" : schemas[0];
        else def = schemas.includes("public") ? "public" : schemas[0];
        updateActiveTab({ selectedSchema: def });
      }
    }
  }, [schemas, activeTab.selectedSchema, updateActiveTab, selectedDSType]);

  // 3. Dependent States/Actions
  //
  // Authoritative synchronous validity contract for the editor selection.
  //
  // A stored selection only describes the exact editor content and the exact
  // editor mount (session) it was captured on. The Run decision resolves
  // validity through synchronous refs — written eagerly on every mutation and
  // re-synced on every render — never through effect-flushed state, so a Run
  // issued in the same batched interaction as a tab/content change can never
  // observe a stale verdict.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const activeSqlRef = useRef(activeTab.sql);
  activeSqlRef.current = activeTab.sql;
  const selectionRef = useRef<EditorSelection | null>(ui.selection);
  selectionRef.current = ui.selection;
  // The editor session advances every time the active tab changes so a
  // remounted editor's dead instance can never have an old delivery treated
  // as live, even when tab id and SQL content happen to match again
  // (A→B→A with unchanged content).
  const sessionRef = useRef<{ tabId: string; key: string }>({
    tabId: activeTabId,
    key: `${activeTabId}:0`,
  });
  if (sessionRef.current.tabId !== activeTabId) {
    const epoch =
      Number(sessionRef.current.key.slice(sessionRef.current.key.lastIndexOf(":") + 1)) + 1;
    sessionRef.current = { tabId: activeTabId, key: `${activeTabId}:${epoch}` };
  }
  const selectionSessionId = sessionRef.current.key;

  /** Synchronous Run-decision boundary: stale selections resolve to "". */
  const resolveSelectedSql = useCallback((): string => {
    const sel = selectionRef.current;
    if (!sel) return "";
    if (sel.sessionId !== sessionRef.current.key) return "";
    if (sel.tabId !== activeTabIdRef.current) return "";
    if (sel.ownerSql !== activeSqlRef.current) return "";
    return sel.sql;
  }, []);

  const setSelectedSql = useCallback(
    (tabId: string, meta: EditorSelectionMeta, sql: string) => {
      const next: EditorSelection = {
        tabId,
        ownerSql: meta.ownerSql,
        sessionId: meta.sessionId,
        sql,
      };
      // Eager write: the value must already be visible to a Run decision that
      // happens before React commits this update.
      selectionRef.current = next;
      ui.setSelection(next);
    },
    [ui.setSelection],
  );

  // Eager tab activation mirrors the commit synchronously so a Run inside the
  // same batched interaction as a tab switch resolves against the newly
  // active tab, before any render or effect has run.
  const setActiveTabIdSync = useCallback(
    (id: string | ((current: string) => string)) => {
      const resolved =
        typeof id === "function" ? id(activeTabIdRef.current) : id;
      if (resolved !== activeTabIdRef.current) {
        activeTabIdRef.current = resolved;
        const epoch =
          Number(sessionRef.current.key.slice(sessionRef.current.key.lastIndexOf(":") + 1)) + 1;
        sessionRef.current = { tabId: resolved, key: `${resolved}:${epoch}` };
        const target = tabsRef.current.find((tab) => tab.id === resolved);
        if (target) activeSqlRef.current = target.sql;
      }
      setActiveTabId(resolved);
    },
    [setActiveTabId],
  );

  // Single synchronous write boundary for every active-tab SQL content
  // change (editor typing, format, saved-query load, format-on-save). It
  // eagerly mirrors the new content into activeSqlRef and drops any stored
  // selection that no longer owns the content, so a Run issued in the same
  // batched interaction as such a mutation resolves against the new full
  // tab content — never against a pre-write selection — before any render
  // or effect has run. Persistence still flows through updateActiveTab.
  const updateActiveTabSqlSync = useCallback(
    (updates: Partial<QueryTab>) => {
      const nextSql = updates.sql;
      if (nextSql !== undefined && nextSql !== activeSqlRef.current) {
        activeSqlRef.current = nextSql;
        const stored = selectionRef.current;
        if (stored && stored.ownerSql !== nextSql) {
          // Eager invalidation: the stored selection describes content that
          // no longer exists in this tab.
          selectionRef.current = null;
          ui.setSelection(null);
        }
      }
      updateActiveTab(updates);
    },
    [ui.setSelection, updateActiveTab],
  );

  const setSqlSync = useCallback(
    (sql: string) => updateActiveTabSqlSync({ sql }),
    [updateActiveTabSqlSync],
  );

  // Render-derived mirror of resolveSelectedSql for passive consumers; both
  // apply the identical three-way validity check.
  const selectedSql =
    ui.selection &&
    ui.selection.sessionId === selectionSessionId &&
    ui.selection.tabId === activeTabId &&
    ui.selection.ownerSql === activeTab.sql
      ? ui.selection.sql
      : "";

  const tableDataMutation = useMutation({
    mutationFn: (vars: { databaseId: string; sql: string }) => databaseApi.execute(vars.databaseId, vars.sql),
    onError: (err: any) => {
      toast.error(err.message || "Failed to load table data");
    }
  });

  const [isRefreshingSelectedObject, setIsRefreshingSelectedObject] = useState(false);
  const [selectedObjectRefreshVersion, setSelectedObjectRefreshVersion] = useState(0);

  const getSelectedObjectType = useCallback(() => {
    if (!ui.selectedTable) return "table";
    if (metadata.views?.includes(ui.selectedTable)) return "view";
    if (metadata.events?.includes(ui.selectedTable)) return "event";
    if (metadata.functions?.includes(ui.selectedTable)) return "function";
    if (metadata.procedures?.includes(ui.selectedTable)) return "procedure";
    if (metadata.triggers?.includes(ui.selectedTable)) return "trigger";
    if (metadata.materializedViews?.includes(ui.selectedTable)) return "materialized_view";
    if (metadata.sequences?.includes(ui.selectedTable)) return "sequence";
    if (metadata.partitions?.includes(ui.selectedTable)) return "partition";
    if (metadata.roles?.includes(ui.selectedTable)) return "role";
    if (metadata.grants?.includes(ui.selectedTable)) return "grant";
    if (metadata.tablespaces?.includes(ui.selectedTable)) return "tablespace";
    if (metadata.extensions?.includes(ui.selectedTable)) return "extension";
    if (metadata.synonyms?.includes(ui.selectedTable)) return "synonym";
    if (metadata.jobs?.includes(ui.selectedTable)) return "job";
    return "table";
  }, [ui.selectedTable, metadata]);

  const lastExecutedSql = (tableDataMutation.variables as any)?.sql;

  const getDataPreviewSql = useCallback(() => {
    const type = getSelectedObjectType();
    if (
      !ui.selectedTable ||
      !activeTab.selectedDS ||
      (type !== "table" && type !== "view")
    ) {
      return null;
    }

    const limit = settings.defaultQueryLimit || 100;
    const offset = ui.dataOffset || 0;
    const q = selectedDSType === "mysql" ? "`" : '"';
    const schema = activeTab.selectedSchema;
    const quotedSchema = schema
      ? schema.split(".").map((part) => `${q}${part}${q}`).join(".")
      : "";
    const fullTableName =
      schema && schema !== "public"
        ? `${quotedSchema}.${q}${ui.selectedTable}${q}`
        : `${q}${ui.selectedTable}${q}`;

    if (selectedDSType === "redis") return `GET "${ui.selectedTable}"`;
    if (selectedDSType === "mongodb") {
      const databaseName = schema && schema !== "public" ? schema : "db";
      return `${databaseName}.${ui.selectedTable}.find()`;
    }
    return `SELECT * FROM ${fullTableName} LIMIT ${limit} OFFSET ${offset}`;
  }, [
    activeTab.selectedDS,
    activeTab.selectedSchema,
    getSelectedObjectType,
    selectedDSType,
    settings.defaultQueryLimit,
    ui.dataOffset,
    ui.selectedTable,
  ]);

  const refreshSelectedObject = useCallback(async () => {
    setIsRefreshingSelectedObject(true);
    try {
      await refetchAll();
      setSelectedObjectRefreshVersion((version) => version + 1);
      const sql = getDataPreviewSql();
      if (sql && activeTab.selectedDS) {
        await tableDataMutation.mutateAsync({
          databaseId: activeTab.selectedDS,
          sql,
        });
      }
    } finally {
      setIsRefreshingSelectedObject(false);
    }
  }, [activeTab.selectedDS, getDataPreviewSql, refetchAll, tableDataMutation]);

  useEffect(() => {
    const sql = getDataPreviewSql();
    if (sql && sql !== lastExecutedSql && !tableDataMutation.isPending) {
      tableDataMutation.mutate({ databaseId: activeTab.selectedDS, sql });
    }
  }, [
    activeTab.selectedDS,
    getDataPreviewSql,
    lastExecutedSql,
    tableDataMutation,
    ui.activeRightTab,
  ]);

  // Reset offset when table changes
  useEffect(() => {
    ui.setDataOffset(0);
  }, [ui.selectedTable, ui.setDataOffset]);

  // Auto-show right panel when a table is selected
  const previousSelectedTable = useRef<string | null>(null);

  useEffect(() => {
    if (ui.selectedTable && ui.selectedTable !== previousSelectedTable.current) {
      ui.setShowRightPanel(true);
      ui.setRightPanelMode("object");
    }
    previousSelectedTable.current = ui.selectedTable;
  }, [ui.selectedTable, ui.setShowRightPanel, ui.setRightPanelMode]);

  // 4. Expose Clean API
  return {
    ...ui,
    selectedSql,
    resolveSelectedSql,
    setSelectedSql,
    selectionSessionId,
    tabs, activeTabId, setActiveTabId: setActiveTabIdSync, activeTab,
    addTab: () => addTab(activeTab.selectedDS, activeTab.selectedSchema),
    closeTab, renameTab,
    sql: activeTab.sql,
    setSql: setSqlSync,
    selectedDS: activeTab.selectedDS,
    setSelectedDS: (ds: string) => updateActiveTab({ selectedDS: ds }),
    selectedSchema: activeTab.selectedSchema,
    setSelectedSchema: (sc: string) => updateActiveTab({ selectedSchema: sc }),
    resultEncoding: settings.resultEncoding,
    defaultQueryLimit: ui.queryLimit,
    
    // Pagination
    nextPage: () => ui.setDataOffset(prev => prev + ui.queryLimit),
    prevPage: () => ui.setDataOffset(prev => Math.max(0, prev - ui.queryLimit)),
    
    // Data & Results
    dataSources, schemas, isLoadingSchemas, tables, ...metadata,
    indexes, foreignKeys, tableInfo, tableDDL,
    refetchTables, refetchAll, isLoadingTables, allColumns, autocompleteColumns,
    isRefreshingSelectedObject, selectedObjectRefreshVersion, refreshSelectedObject,
    results: activeTab.results, columns: activeTab.columns, error: activeTab.error,
    executing, executionTime: (runSQLMutation as any).data?.executionTime || 0,
    currentTData: (tableDataMutation.data as any)?.data || [],
    currentTColumns: (tableDataMutation.data as any)?.columns || [],
    loadingTData: tableDataMutation.isPending,
    selectedDSName: selectedDSData?.databaseName || "",
    selectedDSType, isRelational, selectedObjectType: getSelectedObjectType(),
    savedQueries, refetchSavedQueries,

    // Actions
    handleRun: async (
      sqlOverride?: string | React.SyntheticEvent,
      keyboardSelection?: SQLKeyboardSelection,
    ) => {
      // When the editor sends structured keyboard-selection intent, it
      // supersedes the raw string argument: the override is honored only if
      // its frozen ownership intent still describes the current context —
      // the exact same synchronous boundary (session + owning SQL)
      // resolveSelectedSql applies to stored selections. After a
      // format/saved-query write the Monaco model lags behind activeSqlRef,
      // so the stale selection fails the ownerSql check and the new full tab
      // content runs instead. Non-editor callers (toolbar, sidebar, builder)
      // pass plain strings with no intent and keep their explicit override.
      let actualSql: string | undefined;
      if (keyboardSelection) {
        if (
          keyboardSelection.text.trim() !== "" &&
          keyboardSelection.sessionId === sessionRef.current.key &&
          keyboardSelection.ownerSql === activeSqlRef.current
        ) {
          actualSql = keyboardSelection.text;
        }
      } else if (typeof sqlOverride === "string") {
        actualSql = sqlOverride;
      }
      try {
        await saveActiveSavedQuery(actualSql);
      } catch (error: any) {
        toast.error(error?.message || "Failed to save query before run");
        return;
      }
      updateActiveTab({ error: null });
      // No valid explicit override means "run the active editor content":
      // resolve it synchronously from the authoritative ref so a Run issued
      // in the same batched interaction as a tab/content change targets the
      // current tab's SQL, not the last committed render's closure value.
      return handleRun(actualSql ?? activeSqlRef.current);
    },
    handleExplain: (sqlOverride?: string | React.SyntheticEvent) => {
      const actualSql = typeof sqlOverride === "string" ? sqlOverride : undefined;
      updateActiveTab({ error: null });
      return handleExplain(actualSql || undefined);
    },
    handleFormat: () => handleFormat(activeTab.sql, setSqlSync),
    handleStop,
    handleImport: () => ui.setIsImportWizardOpen(true),
    handleExport: () => actions.handleExport(activeTab.sql, activeTab.selectedDS),
    handleRollback: () => { handleRun("ROLLBACK;"); toast.info("Rollback command sent"); },
    handleSaveConfirmed: async (
      name: string,
      desc?: string,
    ) => {
      let finalSql = activeTab.sql;
      if (settings.editorFormatOnSave) {
        // We reuse handleFormat logic but synchronously if possible or just call it
        // Since sql-formatter is used in useSQLLabQuery, we can manually call it if we want,
        // but it's better to stay consistent.
        try {
          const { format } = await import("sql-formatter");
          finalSql = format(activeTab.sql, { language: "postgresql" });
          setSqlSync(finalSql);
        } catch (e) {
          console.warn("Format on save failed:", e);
        }
      }
      const savedQuery = await saveQueryMutation.mutateAsync({
        id: activeTab.savedQueryId,
        name,
        description: desc,
        sql: finalSql,
        databaseId: activeTab.selectedDS,
      });
      updateActiveTab({ name, savedQueryId: savedQuery.id });
      toast.success(`Query "${name}" saved`);
      ui.setIsSaveDialogOpen(false);
      refetchSavedQueries();
    },
    handleSelectSavedQuery: (q: any) => {
      updateActiveTabSqlSync({
        sql: q.sql,
        selectedDS: q.databaseId,
        savedQueryId: q.id,
      });
      renameTab(activeTabId, q.name);
      ui.setIsOpenDialogOpen(false);
    },
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
      }

      if (keyColumns.length === 0) {
        toast.error("Cannot update table: No columns found for identification");
        return;
      }

      const q = selectedDSType === "mysql" ? "`" : '"';
      const updates: string[] = [];
      const rowIndices = Object.keys(pendingChanges).map(Number);
      
      for (const rowIndex of rowIndices) {
        const changes = pendingChanges[rowIndex];
        const originalRow = currentData[rowIndex];
        
        const setClauses = Object.entries(changes)
          .filter(([col, val]) => val !== originalRow[col])
          .map(([col, val]) => {
            if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return `${q}${col}${q} = NULL`;
            const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
            return `${q}${col}${q} = ${escapedVal}`;
          });
 
        if (setClauses.length === 0) continue;
 
        const whereClauses = keyColumns.map(k => {
          const val = originalRow[k];
          if (val === null || val === undefined) return `${q}${k}${q} IS NULL`;
          const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
          return `${q}${k}${q} = ${escapedVal}`;
        });
 
        const quotedSchema = schema ? schema.split('.').map((s: string) => `${q}${s}${q}`).join('.') : '';
        const fullTableName = schema && schema !== 'public' ? `${quotedSchema}.${q}${table}${q}` : `${q}${table}${q}`;
        updates.push(`UPDATE ${fullTableName} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`);
      }

      if (updates.length > 0) {
        try {
          // Execute updates sequentially to be safe
          for (const sql of updates) {
            await databaseApi.execute(dsId, sql);
          }
          toast.success(`${updates.length} rows updated`);
          // Refresh data
          const limit = settings.defaultQueryLimit || 1000;
          const offset = ui.dataOffset || 0;
          const q = selectedDSType === "mysql" ? "`" : '"';
          const quotedSchema = schema ? schema.split('.').map((s: string) => `${q}${s}${q}`).join('.') : '';
          const fullTableName = schema && schema !== 'public' ? `${quotedSchema}.${q}${table}${q}` : `${q}${table}${q}`;
          tableDataMutation.mutate({ 
            databaseId: dsId, 
            sql: selectedDSType === "mongodb" ? `${schema || 'db'}.${table}.find()` : `SELECT * FROM ${fullTableName} LIMIT ${limit} OFFSET ${offset}` 
          });
        } catch (err: any) {
          toast.error(err.message);
        }
      }
    },
    isLoadingColumns: isLoadingSchemas || isLoadingTables || isMetaLoadingCols,
  };
}

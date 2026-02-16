/**
 * @file page.tsx
 * @description Main SQLLab page component for executing and managing SQL queries.
 * This file orchestrates various components like the editor, toolbar, result panel, and sidebar.
 * Logic is managed by the useSQLLab hook.
 *
 * @performance Implements lazy loading for conditional and heavy components:
 * - AIAssistantSidebar: Only loads when AI sidebar is toggled on
 * - SQLLabObjectPanel/HistoryPanel: Only loads when right panel is visible
 * - SQLLabResultPanel: Heavy data table component
 * - SaveQueryDialog/OpenQueryDialog: Only loads when dialogs are opened
 */

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

// Static imports for critical above-the-fold components
import { SQLLabSidebar } from "./components/SQLLabSidebar";
import { SQLLabToolbar } from "./components/SQLLabToolbar";
import {
  SQLLabEditorContainer,
  type SyntaxError,
} from "./components/SQLLabEditorContainer";
import { SQLLabResultPanel } from "./components/SQLLabResultPanel";

// Loading skeletons
import { PanelSkeleton, SidebarSkeleton } from "./components/Skeletons";

// Lazy-loaded components for conditional/heavy components

const SQLLabObjectPanel = dynamic(
  () =>
    import("./components/SQLLabObjectPanel").then((m) => m.SQLLabObjectPanel),
  {
    ssr: false,
    loading: () => <PanelSkeleton />,
  },
);

const SQLLabHistoryPanel = dynamic(
  () =>
    import("./components/SQLLabHistoryPanel").then((m) => m.SQLLabHistoryPanel),
  {
    ssr: false,
    loading: () => <PanelSkeleton />,
  },
);

const AIAssistantSidebar = dynamic(
  () =>
    import("./components/AIAssistantSidebar").then((m) => m.AIAssistantSidebar),
  {
    ssr: false,
    loading: () => <SidebarSkeleton />,
  },
);

const SaveQueryDialog = dynamic(
  () => import("./components/SaveQueryDialog").then((m) => m.SaveQueryDialog),
  { ssr: false },
);

const OpenQueryDialog = dynamic(
  () => import("./components/OpenQueryDialog").then((m) => m.OpenQueryDialog),
  { ssr: false },
);

// Hooks
// Hooks
import { useSQLLab } from "./hooks/useSQLLab";
import { AccessRequestGuard } from "./components/AccessRequestGuard";
import { useUserPrivileges } from "@/hooks/use-user-privileges";

export default function SQLLabPage() {
  const {
    // State
    sql,
    setSql,
    activeRightTab,
    setActiveRightTab,
    activeResultTab,
    setActiveResultTab,
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
    undoTrigger,
    redoTrigger,
    tabSize,

    // Data
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    views,
    functions,
    procedures,
    triggers,
    events,
    isLoadingTables,
    columnsData,
    allColumns,
    isLoadingColumns,
    indexes,
    foreignKeys,
    tableInfo,
    tableDDL,
    results,
    columns,
    executing,
    error,
    currentTData,
    currentTColumns,
    loadingTData,
    selectedDSName,
    executionTime,

    // Actions
    handleRun,
    handleFormat,
    handleStop,
    handleSave,
    handleSaveConfirmed,
    handleOpen,
    handleSelectSavedQuery,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    isOpenDialogOpen,
    setIsOpenDialogOpen,
    savedQueries,
    refetchTables,
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    handleImport,
    handleExport,
    handleUndo,
    handleRedo,
    showAISidebar,
    setShowAISidebar,
    setSelectedText,
  } = useSQLLab();

  // Syntax validation errors from the editor
  const [syntaxErrors, setSyntaxErrors] = useState<SyntaxError[]>([]);

  // Permissions
  const { hasPrivilege, isLoading: isLoadingPrivileges } = useUserPrivileges();
  const canAccessSQLLab = hasPrivilege("SQLLab_ACCESS");

  return (
    <AccessRequestGuard
      hasAccess={canAccessSQLLab}
      isLoading={isLoadingPrivileges}
    >
      <div className="flex flex-col h-full overflow-hidden bg-background text-foreground select-none">
        <div className="flex-1 flex overflow-hidden">
          <SQLLabSidebar
            dataSources={dataSources}
            selectedDS={selectedDS}
            setSelectedDS={setSelectedDS}
            schemas={schemas}
            selectedSchema={selectedSchema}
            setSelectedSchema={setSelectedSchema}
            isLoadingTables={isLoadingTables}
            tables={tables}
            views={views}
            functions={functions}
            procedures={procedures}
            triggers={triggers}
            events={events}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            onRefreshTables={refetchTables}
          />

          <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
            <SQLLabToolbar
              handleRun={handleRun}
              executing={executing}
              selectedDS={selectedDS}
              showRightPanel={showRightPanel}
              setShowRightPanel={setShowRightPanel}
              rightPanelMode={rightPanelMode}
              setRightPanelMode={setRightPanelMode}
              handleFormat={handleFormat}
              handleStop={handleStop}
              autoCommit={autoCommit}
              setAutoCommit={setAutoCommit}
              onSave={handleSave}
              onOpen={handleOpen}
              onImport={handleImport}
              onExport={handleExport}
              onUndo={handleUndo}
              onRedo={handleRedo}
              showAISidebar={showAISidebar}
              setShowAISidebar={setShowAISidebar}
            />

            <div className="flex-1 flex overflow-hidden">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={65} minSize={30}>
                  <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={60} minSize={20}>
                      <SQLLabEditorContainer
                        sql={sql}
                        setSql={setSql}
                        onPositionChange={setCursorPos}
                        selectedDSName={selectedDSName}
                        selectedSchema={selectedSchema}
                        onRun={handleRun}
                        onFormat={handleFormat}
                        onSelectionChange={setSelectedText}
                        onStop={handleStop}
                        onSave={handleSave}
                        tabSize={tabSize}
                        tables={tables as any}
                        columns={allColumns as any}
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabChange={setActiveTabId}
                        onAddTab={addTab}
                        onCloseTab={closeTab}
                        onRenameTab={renameTab}
                        undoTrigger={undoTrigger}
                        redoTrigger={redoTrigger}
                        onErrorsChange={setSyntaxErrors}
                      />
                    </ResizablePanel>

                    <ResizableHandle
                      withHandle
                      className="h-1 hover:bg-primary/20 transition-colors"
                    />

                    <ResizablePanel defaultSize={40} minSize={10}>
                      <SQLLabResultPanel
                        executing={executing}
                        error={error}
                        results={results}
                        columns={columns}
                        cursorPos={cursorPos}
                        tabSize={tabSize}
                        syntaxErrors={syntaxErrors}
                        activeTab={activeResultTab}
                        onTabChange={setActiveResultTab}
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                {showRightPanel && (
                  <ResizableHandle
                    withHandle
                    className="w-1 hover:bg-primary/20 transition-colors"
                  />
                )}

                {showRightPanel && (
                  <ResizablePanel
                    defaultSize={35}
                    minSize={20}
                    className="bg-background"
                  >
                    {rightPanelMode === "object" ? (
                      <SQLLabObjectPanel
                        activeRightTab={activeRightTab}
                        setActiveRightTab={setActiveRightTab}
                        selectedSchema={selectedSchema}
                        selectedTable={selectedTable}
                        onRefreshTables={refetchTables}
                        loadingTData={loadingTData}
                        currentTData={currentTData}
                        currentTColumns={currentTColumns}
                        executionTime={executionTime}
                        isLoadingColumns={isLoadingColumns}
                        columnsData={columnsData as any}
                        indexes={indexes}
                        foreignKeys={foreignKeys}
                        tableInfo={tableInfo}
                        tableDDL={tableDDL}
                        triggers={triggers}
                      />
                    ) : (
                      <SQLLabHistoryPanel
                        onSelectQuery={(historySql) => {
                          setSql(historySql);
                          toast.info("SQL loaded from history");
                        }}
                        selectedDS={selectedDS}
                        selectedSchema={selectedSchema}
                      />
                    )}
                  </ResizablePanel>
                )}

                {showAISidebar && (
                  <>
                    <ResizableHandle
                      withHandle
                      className="w-1 hover:bg-primary/20 transition-colors"
                    />
                    <ResizablePanel defaultSize={30} minSize={20}>
                      <div className="h-full w-full bg-background border-l">
                        <AIAssistantSidebar
                          show={true}
                          onClose={() => setShowAISidebar(false)}
                          onApplySQL={(aiSql) => {
                            setSql(aiSql);
                            toast.success("AI SQL inserted into editor");
                          }}
                          databaseId={selectedDS}
                          schema={selectedSchema}
                        />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>
          </div>
        </div>

        <SaveQueryDialog
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          onConfirm={handleSaveConfirmed}
          defaultName={tabs.find((t) => t.id === activeTabId)?.name}
        />

        <OpenQueryDialog
          open={isOpenDialogOpen}
          onOpenChange={setIsOpenDialogOpen}
          savedQueries={savedQueries}
          onSelect={handleSelectSavedQuery}
        />
      </div>
    </AccessRequestGuard>
  );
}

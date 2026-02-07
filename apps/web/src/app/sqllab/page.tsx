/**
 * @file page.tsx
 * @description Main SQLLab page component for executing and managing SQL queries.
 * This file orchestrates various components like the editor, toolbar, result panel, and sidebar.
 * Logic is managed by the useSQLLab hook.
 */

"use client";

import { useState } from "react";

import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

// Components
import { SQLLabSidebar } from "./components/SQLLabSidebar";
import { SQLLabToolbar } from "./components/SQLLabToolbar";
import {
  SQLLabEditorContainer,
  type SyntaxError,
} from "./components/SQLLabEditorContainer";
import { SQLLabResultPanel } from "./components/SQLLabResultPanel";
import { SQLLabObjectPanel } from "./components/SQLLabObjectPanel";
import { SQLLabHistoryPanel } from "./components/SQLLabHistoryPanel";
import { SaveQueryDialog } from "./components/SaveQueryDialog";
import { OpenQueryDialog } from "./components/OpenQueryDialog";
import { AIAssistantSidebar } from "./components/AIAssistantSidebar";

// Hooks
import { useSQLLab } from "./hooks/useSQLLab";

export default function SQLLabPage() {
  const {
    // State
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
  } = useSQLLab();

  // Syntax validation errors from the editor
  const [syntaxErrors, setSyntaxErrors] = useState<SyntaxError[]>([]);

  return (
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
          tables={tables as any}
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
                      onStop={handleStop}
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
  );
}

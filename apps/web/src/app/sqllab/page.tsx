/**
 * @file page.tsx
 * @description Main entry point for the SQL Lab page, orchestrating the sidebar, toolbar, editor, and results panels.
 */

"use client";

import { memo, useEffect, Suspense, lazy } from "react";
import { toast } from "sonner";
import { markPerformance } from "@/lib/performance/performance-marks";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

// Context
import {
  SQLLabProvider,
  useSQLLabContext,
  useSQLLabTabMetadataContext,
  useSQLLabResultContext,
} from "./context/SQLLabContext";

// Static imports
import { SQLLabSidebar } from "./components/SQLLabSidebar";
import { SQLLabToolbar } from "./components/SQLLabToolbar";
import { SQLLabEditorContainer } from "./components/SQLLabEditorContainer";
import { SQLLabResultPanel } from "./components/SQLLabResultPanel";

const StableSQLLabSidebar = memo(SQLLabSidebar);
const StableSQLLabToolbar = memo(SQLLabToolbar);
const LiveSQLLabResultPanel = memo(SQLLabResultPanel);

// Skeletons
import { PanelSkeleton } from "./components/Skeletons";

// Lazy-loaded components
const SQLLabObjectPanel = lazy(() => import("./components/SQLLabObjectPanel").then(m => ({ default: m.SQLLabObjectPanel })));
const SQLLabHistoryPanel = lazy(() => import("./components/SQLLabHistoryPanel").then(m => ({ default: m.SQLLabHistoryPanel })));
const SaveQueryDialog = lazy(() => import("./components/SaveQueryDialog").then(m => ({ default: m.SaveQueryDialog })));
const OpenQueryDialog = lazy(() => import("./components/OpenQueryDialog").then(m => ({ default: m.OpenQueryDialog })));
const SchemaContent = lazy(() => import("./components/SchemaContent").then(m => ({ default: m.SchemaContent })));
const ImportWizardModal = lazy(() => import("./components/import/ImportWizardModal").then(m => ({ default: m.ImportWizardModal })));
const StableSQLLabDialogs = memo(SQLLabDialogs);

export default function SQLLabPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading SQL Lab...</div>}>
      <SQLLabProvider>
        <SQLLabContent />
      </SQLLabProvider>
    </Suspense>
  );
}

function SQLLabContent() {
  const lab = useSQLLabContext();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background text-foreground">
      <SQLLabPerformanceMarks />
      <div className="flex-1 flex overflow-hidden">
        <StableSQLLabSidebar />

        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
          <StableSQLLabToolbar />

          <div className="flex-1 flex overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel
                defaultSize={65}
                minSize={30}
                className={lab.showAISidebar ? "!basis-full" : undefined}
              >
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel
                    defaultSize={60}
                    minSize={20}
                    className={lab.showAISidebar ? "!basis-full" : undefined}
                  >
                    <SQLLabEditorContainer />
                  </ResizablePanel>

                  {!lab.showAISidebar && (
                    <>
                      <ResizableHandle withHandle className="h-1 hover:bg-primary/20 transition-colors" />

                      <ResizablePanel defaultSize={40} minSize={10}>
                        <LiveSQLLabResultPanel />
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>

              {!lab.showAISidebar && lab.showRightPanel && (
                <>
                  <ResizableHandle withHandle className="w-1 hover:bg-primary/20 transition-colors" />
                  <ResizablePanel defaultSize={35} minSize={20} className="bg-background">
                    <Suspense fallback={<PanelSkeleton />}>
                      {lab.rightPanelMode === "object" ? (
                        <SQLLabObjectPanel />
                      ) : lab.rightPanelMode === "history" ? (
                        <SQLLabHistoryPanel />
                      ) : (
                        <SchemaContent
                          databaseId={lab.selectedDS}
                          schema={lab.selectedSchema}
                          dataSources={lab.dataSources}
                        />
                      )}
                    </Suspense>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </div>

      <StableSQLLabDialogs />
    </div>
  );
}

function SQLLabPerformanceMarks() {
  const lab = useSQLLabContext();
  const result = useSQLLabResultContext();

  useEffect(() => {
    markPerformance("sqllab_mounted");
  }, []);

  useEffect(() => {
    if (lab.selectedDS && !lab.isLoadingColumns) {
      markPerformance("metadata_loaded");
    }
  }, [lab.isLoadingColumns, lab.selectedDS]);

  useEffect(() => {
    if (
      !result.executing &&
      !result.error &&
      (result.results.length > 0 || result.columns.length > 0)
    ) {
      markPerformance("result_rendered");
    }
  }, [result.columns, result.error, result.executing, result.results]);

  return null;
}

function SQLLabDialogs() {
  const lab = useSQLLabContext();
  const { activeTabName } = useSQLLabTabMetadataContext();

  return (
    <Suspense fallback={null}>
      <SaveQueryDialog
        open={lab.isSaveDialogOpen}
        onOpenChange={lab.setIsSaveDialogOpen}
        onConfirm={lab.handleSaveConfirmed}
        defaultName={activeTabName}
      />
      <OpenQueryDialog
        open={lab.isOpenDialogOpen}
        onOpenChange={lab.setIsOpenDialogOpen}
        savedQueries={lab.savedQueries}
        onSelect={lab.handleSelectSavedQuery}
      />
      <ImportWizardModal
        open={lab.isImportWizardOpen}
        onOpenChange={lab.setIsImportWizardOpen}
        databaseId={lab.selectedDS}
        schemaName={lab.selectedSchema}
      />
    </Suspense>
  );
}

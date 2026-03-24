/**
 * @file page.tsx
 * @description Main entry point for the SQL Lab page, orchestrating the sidebar, toolbar, editor, and results panels.
 */

"use client";

import { useState, Suspense, lazy } from "react";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

// Context
import { SQLLabProvider, useSQLLabContext } from "./context/SQLLabContext";

// Static imports
import { SQLLabSidebar } from "./components/SQLLabSidebar";
import { SQLLabToolbar } from "./components/SQLLabToolbar";
import { SQLLabEditorContainer } from "./components/SQLLabEditorContainer";
import { SQLLabResultPanel } from "./components/SQLLabResultPanel";

// Skeletons
import { PanelSkeleton, SidebarSkeleton } from "./components/Skeletons";

// Lazy-loaded components
const SQLLabObjectPanel = lazy(() => import("./components/SQLLabObjectPanel").then(m => ({ default: m.SQLLabObjectPanel })));
const SQLLabHistoryPanel = lazy(() => import("./components/SQLLabHistoryPanel").then(m => ({ default: m.SQLLabHistoryPanel })));
const AIAssistantSidebar = lazy(() => import("./components/AIAssistantSidebar").then(m => ({ default: m.AIAssistantSidebar })));
const SaveQueryDialog = lazy(() => import("./components/SaveQueryDialog").then(m => ({ default: m.SaveQueryDialog })));
const OpenQueryDialog = lazy(() => import("./components/OpenQueryDialog").then(m => ({ default: m.OpenQueryDialog })));
const SchemaContent = lazy(() => import("./components/SchemaContent").then(m => ({ default: m.SchemaContent })));

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
      <div className="flex-1 flex overflow-hidden">
        <SQLLabSidebar />

        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
          <SQLLabToolbar />

          <div className="flex-1 flex overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={65} minSize={30}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={60} minSize={20}>
                    <SQLLabEditorContainer />
                  </ResizablePanel>

                  <ResizableHandle withHandle className="h-1 hover:bg-primary/20 transition-colors" />

                  <ResizablePanel defaultSize={40} minSize={10}>
                    <SQLLabResultPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              {lab.showRightPanel && (
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

              {lab.showAISidebar && (
                <>
                  <ResizableHandle withHandle className="w-1 hover:bg-primary/20 transition-colors" />
                  <ResizablePanel defaultSize={30} minSize={20}>
                    <div className="h-full w-full bg-background border-l">
                      <Suspense fallback={<SidebarSkeleton />}>
                        <AIAssistantSidebar />
                      </Suspense>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <SaveQueryDialog
          open={lab.isSaveDialogOpen}
          onOpenChange={lab.setIsSaveDialogOpen}
          onConfirm={lab.handleSaveConfirmed}
          defaultName={lab.tabs.find((t) => t.id === lab.activeTabId)?.name}
        />
        <OpenQueryDialog
          open={lab.isOpenDialogOpen}
          onOpenChange={lab.setIsOpenDialogOpen}
          savedQueries={lab.savedQueries}
          onSelect={lab.handleSelectSavedQuery}
        />
      </Suspense>
    </div>
  );
}

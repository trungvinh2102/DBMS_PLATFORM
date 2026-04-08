/**
 * @file page.tsx
 * @description Main Connections page component for managing database connections.
 */

"use client";

import { useState, Suspense, lazy } from "react";
import { ConnectionTable } from "./components/ConnectionTable";
import { ConnectionsHeader } from "./components/ConnectionsHeader";
import { useConnectionsPage } from "./hooks/use-connections-page";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Lazy-loaded components for conditional rendering
const ConnectionConfig = lazy(() => import("./components/ConnectionConfig").then((m) => ({ default: m.ConnectionConfig })));
const DeleteConnectionDialog = lazy(() => import("./components/DeleteConnectionDialog").then((m) => ({ default: m.DeleteConnectionDialog })));

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center">
          Loading connections...
        </div>
      }
    >
      <ConnectionsContent />
    </Suspense>
  );
}

function ConnectionsContent() {
  const { state, data, handlers } = useConnectionsPage();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    activeConn,
    searchQuery,
    isCreateModalOpen,
    selectedType,
    formData,
    isSaving,
    isFetching,
    deleteId,
    isDeleting,
    setActiveConn,
    setSearchQuery,
    setIsCreateModalOpen,
    setSelectedType,
    setFormData,
    setEditingId,
    setDeleteId,
  } = state;

  const { connections, filteredConnections } = data;

  const {
    handleSubmit,
    refetch,
    handleEdit,
    handleDelete,
    handleOpenUpdate,
    handleBack,
    confirmDelete,
    handleBulkDelete,
  } = handlers;

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground overflow-hidden flex transition-colors">
      <main className="flex-1 overflow-auto bg-white dark:bg-background transition-colors">
        {activeConn ? (
          <div className="flex flex-col h-full">
            <div className="h-14 border-b border-slate-200 dark:border-border flex items-center px-6 shrink-0 bg-white dark:bg-background">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={handleBack}
                      className="cursor-pointer font-medium hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Connections
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-slate-900 dark:text-slate-100">
                      {["sqlite", "duckdb"].includes(activeConn.type) 
                        ? (activeConn.databaseName || "").replace(/\.(db|duckdb|sqlite|sqlite3)$/i, "") 
                        : activeConn.databaseName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <Suspense fallback={<div className="animate-pulse space-y-4 p-8"><div className="h-8 w-48 bg-muted rounded" /><div className="h-64 bg-muted rounded-lg" /></div>}>
                <ConnectionConfig activeConn={activeConn} onBack={handleBack} />
              </Suspense>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  DB Connections
                </h1>
              </div>

              <ConnectionsHeader
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isCreateModalOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isSaving={isSaving}
                isFetching={isFetching}
                refetch={refetch}
                setEditingId={setEditingId}
              />

              <div className="flex-1 min-h-0 border border-slate-200 dark:border-border rounded-lg overflow-hidden bg-white dark:bg-background flex flex-col">
                {selectedIds.length > 0 && (
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-border bg-slate-50/50 dark:bg-accent/20 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {selectedIds.length} connection{selectedIds.length > 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-2 shadow-sm font-bold"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${selectedIds.length} connections?`)) {
                          handleBulkDelete(selectedIds).then(() => setSelectedIds([]));
                        }
                      }}
                    >
                      <Trash className="h-4 w-4" />
                      Delete Selected
                    </Button>
                  </div>
                )}
                <ConnectionTable
                  connections={filteredConnections as unknown as any[]}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUpdate={handleOpenUpdate}
                  onRowSelectionChange={setSelectedIds}
                />
              </div>

              <div className="py-4 border-t border-slate-100 dark:border-border mt-auto text-[13px] text-slate-500 font-medium">
                1 - {filteredConnections.length} of {connections?.length || 0}{" "}
                connections
              </div>
            </div>
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        <DeleteConnectionDialog
          deleteId={deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      </Suspense>
    </div>
  );
}

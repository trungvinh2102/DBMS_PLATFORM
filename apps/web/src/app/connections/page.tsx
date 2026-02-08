/**
 * @file page.tsx
 * @description Main Connections page component for managing database connections.
 * This file serves as the container for connection listing, creation, and configuration.
 *
 * @performance Implements lazy loading for conditional components:
 * - ConnectionConfig: Only loads when a connection is selected for editing
 * - DeleteConnectionDialog: Only loads when delete dialog is triggered
 *
 * @example
 * // Next.js page component
 * export default function ConnectionsPage() ...
 */

"use client";

import dynamic from "next/dynamic";
import { Database } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { ConnectionTable } from "./components/ConnectionTable";
import { ConnectionsHeader } from "./components/ConnectionsHeader";
import { useConnectionsPage } from "./hooks/use-connections-page";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Lazy-loaded components for conditional rendering
const ConnectionConfig = dynamic(
  () => import("./components/ConnectionConfig").then((m) => m.ConnectionConfig),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-4 p-8">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    ),
  },
);

const DeleteConnectionDialog = dynamic(
  () =>
    import("./components/DeleteConnectionDialog").then(
      (m) => m.DeleteConnectionDialog,
    ),
  { ssr: false },
);

export default function ConnectionsPage() {
  const { state, data, handlers } = useConnectionsPage();

  const {
    activeConn,
    activeTab,
    searchQuery,
    isCreateModalOpen,
    selectedType,
    formData,
    isSaving,
    isFetching,
    deleteId,
    isDeleting,
    setActiveConn,
    setActiveTab,
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
    confirmDelete,
  } = handlers;

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground overflow-hidden flex transition-colors">
      <Sidebar activeTab={activeTab} setActiveTab={state.setActiveTab} />

      <main className="flex-1 overflow-auto bg-white dark:bg-background border-l border-slate-200 dark:border-border transition-colors">
        {activeConn ? (
          <div className="flex flex-col h-full">
            <div className="h-14 border-b border-slate-200 dark:border-border flex items-center px-6 shrink-0 bg-white dark:bg-background">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => {
                        setActiveConn(null);
                        setActiveTab("DB Connections");
                      }}
                      className="cursor-pointer font-medium hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Connections
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-slate-900 dark:text-slate-100">
                      {activeConn.databaseName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <ConnectionConfig
                activeConn={activeConn}
                onBack={() => {
                  setActiveConn(null);
                  setActiveTab("DB Connections");
                }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {activeTab === "DB Connections" && (
              <div className="flex-1 flex flex-col p-8 space-y-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  DB Connections
                </h1>

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

                <div className="flex-1 min-h-0 border border-slate-200 dark:border-border rounded-lg overflow-hidden bg-white dark:bg-background">
                  <ConnectionTable
                    connections={filteredConnections as unknown as any[]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onUpdate={handleOpenUpdate}
                  />
                </div>

                <div className="py-4 border-t border-slate-100 dark:border-border mt-auto text-[13px] text-slate-500 font-medium">
                  1 - {filteredConnections.length} of {connections?.length || 0}{" "}
                  connections
                </div>
              </div>
            )}

            {!activeConn && activeTab !== "DB Connections" && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Database className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-medium">
                  {activeTab} module is coming soon
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <DeleteConnectionDialog
        deleteId={deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

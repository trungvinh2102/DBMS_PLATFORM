/**
 * @file page.tsx
 * @description Main Connections page component for managing database connections.
 * This file serves as the container for connection listing.
 */

"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ConnectionTable } from "./components/ConnectionTable";
import { ConnectionsHeader } from "./components/ConnectionsHeader";
import { useConnectionsPage } from "./hooks/use-connections-page";
import type { DataSource } from "@/lib/types";

const DeleteConnectionDialog = dynamic(
  () =>
    import("./components/DeleteConnectionDialog").then(
      (m) => m.DeleteConnectionDialog,
    ),
  { ssr: false },
);

export default function ConnectionsPage() {
  const router = useRouter();
  const { state, data, handlers } = useConnectionsPage();

  const {
    searchQuery,
    isCreateModalOpen,
    selectedType,
    formData,
    isSaving,
    isFetching,
    deleteId,
    isDeleting,
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
    handleDelete,
    handleOpenUpdate,
    confirmDelete,
  } = handlers;

  const handleEdit = (conn: DataSource) => {
    router.push(`/connections/database-connections/${conn.id}`);
  };

  return (
    <div className="h-full flex flex-col">
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
            connections={filteredConnections}
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

      <DeleteConnectionDialog
        deleteId={deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

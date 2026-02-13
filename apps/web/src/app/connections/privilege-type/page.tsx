/**
 * @file page.tsx
 * @description Privilege Type management page for Enterprise DBAC system.
 * Orchestrates the privilege registry view, grouping types by category.
 */

"use client";

import { Shield } from "lucide-react";
import { usePrivilegeTypes } from "./hooks/use-privilege-types";
import { PrivilegeHeader } from "./components/PrivilegeHeader";
import { PrivilegeCategoryCard } from "./components/PrivilegeCategoryCard";
import { PrivilegeDialogs } from "./components/PrivilegeDialogs";

export default function PrivilegeTypePage() {
  const {
    privileges,
    isLoading,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    isCreateOpen,
    setIsCreateOpen,
    editingItem,
    setEditingItem,
    deleteItem,
    setDeleteItem,
    expandedCategories,
    toggleCategory,
    formData,
    setFormData,
    createMutation,
    updateMutation,
    deleteMutation,
    seedMutation,
    openEdit,
    groupedPrivileges,
  } = usePrivilegeTypes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <PrivilegeHeader
        privilegeCount={privileges.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        onAddPrivilege={() => setIsCreateOpen(true)}
        onSeedDefaults={() => seedMutation.mutate()}
        isSeedPending={seedMutation.isPending}
      />

      <div className="flex-1 px-8 mt-4 overflow-auto space-y-4">
        {Object.keys(groupedPrivileges).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Shield className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No privilege types found
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {privileges.length === 0
                  ? 'Click "Seed Defaults" to populate all privilege types'
                  : "Try adjusting your search or filter"}
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groupedPrivileges).map(([category, items]) => (
            <PrivilegeCategoryCard
              key={category}
              category={category}
              items={items}
              isExpanded={expandedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
              onEdit={openEdit}
              onDelete={setDeleteItem}
            />
          ))
        )}
      </div>

      <PrivilegeDialogs
        isCreateOpen={isCreateOpen}
        setIsCreateOpen={setIsCreateOpen}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        deleteItem={deleteItem}
        setDeleteItem={setDeleteItem}
        formData={formData}
        setFormData={setFormData}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        onDelete={(id) => deleteMutation.mutate(id)}
        isCreatePending={createMutation.isPending}
        isUpdatePending={updateMutation.isPending}
        isDeletePending={deleteMutation.isPending}
      />
    </div>
  );
}

/**
 * @file use-privilege-types.ts
 * @description Custom hook for managing privilege type state and database operations.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { privilegeApi } from "@/lib/api-client";
import type { PrivilegeType, PrivilegeFormData } from "@/lib/types";
import { CATEGORY_ORDER } from "../constants";

export function usePrivilegeTypes() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrivilegeType | null>(null);
  const [deleteItem, setDeleteItem] = useState<PrivilegeType | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER),
  );

  const [formData, setFormData] = useState<PrivilegeFormData>({
    code: "",
    category: "DATA_ACCESS",
    description: "",
  });

  // Queries
  const { data: privileges = [] as PrivilegeType[], isLoading } = useQuery<
    PrivilegeType[]
  >({
    queryKey: ["privilegeTypes"],
    queryFn: () => privilegeApi.listTypes(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: PrivilegeFormData) => privilegeApi.createType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privilegeTypes"] });
      toast.success("Privilege type created");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PrivilegeFormData }) =>
      privilegeApi.updateType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privilegeTypes"] });
      toast.success("Privilege type updated");
      resetForm();
      setEditingItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => privilegeApi.deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privilegeTypes"] });
      toast.success("Privilege type deleted");
      setDeleteItem(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const seedMutation = useMutation({
    mutationFn: () => privilegeApi.seedDefaults(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["privilegeTypes"] });
      toast.success(
        `Seeded ${data.created} new privilege types (${data.total} total)`,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Helpers
  const resetForm = () => {
    setFormData({ code: "", category: "DATA_ACCESS", description: "" });
  };

  const openEdit = (item: PrivilegeType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      category: item.category,
      description: item.description || "",
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filteredPrivileges = useMemo(() => {
    return privileges.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "ALL" || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [privileges, searchQuery, filterCategory]);

  const groupedPrivileges = useMemo(() => {
    const groups: Record<string, PrivilegeType[]> = {};
    for (const cat of CATEGORY_ORDER) {
      const items = filteredPrivileges.filter((p) => p.category === cat);
      if (items.length > 0) {
        groups[cat] = items;
      }
    }
    return groups;
  }, [filteredPrivileges]);

  return {
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
    resetForm,
    groupedPrivileges,
  };
}

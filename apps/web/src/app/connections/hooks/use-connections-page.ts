/**
 * @file use-connections-page.ts
 * @description Custom hook encapsulating logic for the Connections page.
 * Handle state management for connection listing, creation, and deletion.
 *
 * @example
 * const { connections, handleSubmit, ... } = useConnectionsPage();
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { DEFAULT_PORTS } from "../components/constants";

export function useConnectionsPage() {
  const [selectedType, setSelectedType] = useState<string>("postgres");
  const [formData, setFormData] = useState({
    host: "localhost",
    port: DEFAULT_PORTS["postgres"],
    user: "",
    password: "",
    database: "",
    uri: "",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeConn, setActiveConn] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("DB Connections");
  const [searchQuery, setSearchQuery] = useState("");

  // Clear active connection when switching away from DB Connections
  useEffect(() => {
    if (activeTab !== "DB Connections") {
      setActiveConn(null);
    }
  }, [activeTab]);

  const {
    data: connections,
    refetch,
    isFetching,
  } = useQuery(trpc.database.listDatabases.queryOptions());

  const createMutation = useMutation(
    trpc.database.createDatabase.mutationOptions(),
  );
  const updateMutation = useMutation(
    trpc.database.updateDatabase.mutationOptions(),
  );
  const deleteMutation = useMutation(
    trpc.database.deleteDatabase.mutationOptions(),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = {
        uri: formData.uri || undefined,
        host: formData.host,
        port: formData.port ? parseInt(formData.port) : undefined,
        user: formData.user,
        password: formData.password || undefined,
        database: formData.database,
      };

      if (editingId) {
        const updateConfig = { ...config };
        if (!formData.password) {
          updateConfig.password = "********";
        }

        await updateMutation.mutateAsync({
          id: editingId,
          databaseName: formData.database,
          type: selectedType,
          config: updateConfig,
        });
        toast.success("Connection updated successfully");
      } else {
        await createMutation.mutateAsync({
          databaseName: formData.database,
          type: selectedType,
          config,
        });
        toast.success("Connection created successfully");
      }

      setIsCreateModalOpen(false);
      setEditingId(null);
      refetch();
      resetForm(selectedType);
    } catch (error: any) {
      toast.error(error.message || "Failed to save connection");
    }
  };

  const resetForm = (type: string) => {
    setFormData({
      host: "localhost",
      port: DEFAULT_PORTS[type] || "5432",
      user: "",
      password: "",
      database: "",
      uri: "",
    });
  };

  const handleOpenUpdate = (conn: any) => {
    setEditingId(conn.id);
    setSelectedType(conn.type);

    const config = conn.config || {};
    setFormData({
      host: config.host || "",
      port: config.port?.toString() || DEFAULT_PORTS[conn.type] || "",
      user: config.user || "",
      password: "",
      database: config.database || conn.databaseName || "",
      uri: config.uri || "",
    });

    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Connection deleted");
      setDeleteId(null);
      refetch();
    } catch (error: any) {
      toast.error("Failed to delete connection");
    }
  };

  const handleEdit = (conn: any) => {
    setActiveConn(conn);
    setActiveTab("DB Connections");
  };

  const filteredConnections = ((connections as any) || []).filter(
    (conn: any) =>
      (conn.databaseName || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conn.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return {
    state: {
      selectedType,
      setSelectedType,
      formData,
      setFormData,
      isCreateModalOpen,
      setIsCreateModalOpen,
      editingId,
      setEditingId,
      deleteId,
      setDeleteId,
      activeConn,
      setActiveConn,
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      isFetching,
      isSaving: createMutation.isPending || updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
    },
    data: {
      connections,
      filteredConnections,
    },
    handlers: {
      handleSubmit,
      handleOpenUpdate,
      handleDelete,
      confirmDelete,
      handleEdit,
      refetch,
      resetForm,
    },
  };
}

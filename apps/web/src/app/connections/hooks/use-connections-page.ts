/**
 * @file use-connections-page.ts
 * @description Custom hook encapsulating logic for the Connections page.
 * Handle state management for connection listing, creation, and deletion.
 *
 * @example
 * const { connections, handleSubmit, ... } = useConnectionsPage();
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { encrypt } from "@/lib/crypto";
import { DEFAULT_PORTS } from "../components/constants";

export function useConnectionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const connIdFromUrl = searchParams.get("id");

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
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: connections,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => databaseApi.create(data),
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => databaseApi.update(data),
  });
  const deleteMutation = useMutation({
    mutationFn: (data: { id: string }) => databaseApi.delete(data.id),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isFileBased = ['sqlite', 'duckdb'].includes(selectedType);

      // File-based databases only need the file path — no credentials
      const config = isFileBased
        ? { database: formData.database }
        : {
            uri: formData.uri ? encrypt(formData.uri) : undefined,
            host: formData.host,
            port: formData.port ? parseInt(formData.port) : undefined,
            user: formData.user,
            password: formData.password ? encrypt(formData.password) : undefined,
            database: formData.database,
          };

      if (editingId) {
        const updateConfig = { ...config };
        if (!formData.password) {
          updateConfig.password = "********";
        }

        // For display name, use filename if file-based and path provided
        let displayName = formData.database;
        if (isFileBased && formData.database) {
          const parts = formData.database.split(/[\\/]/);
          displayName = parts[parts.length - 1] || formData.database;
        }

        await updateMutation.mutateAsync({
          id: editingId,
          databaseName: displayName,
          type: selectedType,
          config: updateConfig,
        });
        toast.success("Connection updated successfully");
      } else {
        // For display name, use filename if file-based and path provided
        let displayName = formData.database;
        if (isFileBased && formData.database) {
          const parts = formData.database.split(/[\\/]/);
          displayName = parts[parts.length - 1] || formData.database;
        }

        await createMutation.mutateAsync({
          databaseName: displayName,
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
    const isFileBased = ['sqlite', 'duckdb'].includes(type);
    setFormData({
      host: isFileBased ? "" : "localhost",
      port: isFileBased ? "" : (DEFAULT_PORTS[type] || "5432"),
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

  // Sync activeConn from URL param when connections are loaded
  useEffect(() => {
    if (!connections) return;

    if (connIdFromUrl) {
      // Find the connection matching the ID in the URL
      const found = (connections as any[]).find(
        (c: any) => c.id === connIdFromUrl,
      );
      
      if (found) {
        // Update activeConn if it's different (or null)
        if (!activeConn || activeConn.id !== found.id) {
          setActiveConn(found);
        }
      } else if (activeConn) {
        // ID in URL is invalid/not found, clear activeConn
        setActiveConn(null);
      }
    } else if (activeConn) {
      // No ID in URL, clear activeConn
      setActiveConn(null);
    }
  }, [connIdFromUrl, connections, activeConn]);

  const handleEdit = useCallback(
    (conn: any) => {
      setActiveConn(conn);
      navigate(`/connections?id=${conn.id}`);
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    navigate("/connections");
  }, [navigate]);

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
      handleBulkDelete: async (ids: string[]) => {
        try {
          await Promise.all(ids.map(id => deleteMutation.mutateAsync({ id })));
          toast.success(`${ids.length} connections deleted`);
          refetch();
        } catch (error: any) {
          toast.error("Failed to delete some connections");
        }
      },
      handleEdit,
      handleBack,
      refetch,
      resetForm,
    },
  };
}

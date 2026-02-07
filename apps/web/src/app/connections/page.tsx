/**
 * @file page.tsx
 * @description Main Connections page component for managing database connections.
 * This file serves as the container for connection listing, creation, and configuration.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Search,
  Filter,
  Plus,
  RotateCw,
  ChevronDown,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { ConnectionTable } from "./components/ConnectionTable";
import { ConnectionDialog } from "./components/ConnectionDialog";
import { ConnectionConfig } from "./components/ConnectionConfig";
import { DEFAULT_PORTS } from "./components/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ConnectionsPage() {
  const [selectedType, setSelectedType] = useState<string>("postgres");
  const [formData, setFormData] = useState({
    name: "",
    host: "localhost",
    port: DEFAULT_PORTS["postgres"],
    user: "",
    password: "",
    database: "",
    description: "",
    uri: "",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeConn, setActiveConn] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("DB Connections");
  const [searchQuery, setSearchQuery] = useState("");

  // Clear active connection when switching away from DB Connections (List or Config view)
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
      // Save all connection data - both URI and individual fields
      const config = {
        uri: formData.uri || undefined,
        host: formData.host,
        port: formData.port ? parseInt(formData.port) : undefined,
        user: formData.user,
        password: formData.password || undefined,
        database: formData.database,
      };

      if (editingId) {
        // Update existing connection
        const updateConfig = { ...config };
        // If password is empty, send marker to keep current password
        if (!formData.password) {
          updateConfig.password = "********";
        }

        await updateMutation.mutateAsync({
          id: editingId,
          name: formData.name,
          type: selectedType,
          description: formData.description,
          config: updateConfig,
        });
        toast.success("Connection updated successfully");
      } else {
        // Create new connection
        await createMutation.mutateAsync({
          name: formData.name,
          type: selectedType,
          description: formData.description,
          config,
        });
        toast.success("Connection created successfully");
      }

      setIsCreateModalOpen(false);
      setEditingId(null);
      refetch();
      // Reset form
      setFormData({
        name: "",
        host: "localhost",
        port: DEFAULT_PORTS[selectedType] || "5432",
        user: "",
        password: "",
        database: "",
        description: "",
        uri: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to save connection");
    }
  };

  const handleOpenUpdate = (conn: any) => {
    setEditingId(conn.id);
    setSelectedType(conn.type);

    // Parse config back to form
    const config = conn.config || {};
    setFormData({
      name: conn.name,
      host: config.host || "",
      port: config.port?.toString() || DEFAULT_PORTS[conn.type] || "",
      user: config.user || "",
      password: "", // Empty - user needs to re-enter if changing
      database: config.database || "",
      description: conn.description || "",
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
      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground overflow-hidden flex transition-colors">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
                      {activeConn.name}
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-10 px-4 bg-white dark:bg-background border-slate-200 dark:border-border text-slate-600 dark:text-slate-300 gap-2 font-medium hover:bg-slate-50 dark:hover:bg-accent"
                  >
                    Connection Name
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>

                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search"
                      className="pl-10 h-10 bg-white dark:bg-background border-slate-200 dark:border-border placeholder:text-slate-400 text-slate-900 dark:text-foreground focus-visible:ring-offset-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-white dark:bg-background border-slate-200 dark:border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-accent"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>

                  <div className="ml-auto flex items-center gap-2">
                    <ConnectionDialog
                      isOpen={isCreateModalOpen}
                      onOpenChange={(open) => {
                        setIsCreateModalOpen(open);
                        if (!open) setEditingId(null);
                      }}
                      selectedType={selectedType}
                      setSelectedType={setSelectedType}
                      formData={formData}
                      setFormData={setFormData}
                      onSubmit={handleSubmit}
                      isPending={
                        createMutation.isPending || updateMutation.isPending
                      }
                      trigger={
                        <Button
                          className="h-10 bg-blue-600 hover:bg-blue-700 text-white gap-2 px-4 shadow-sm font-semibold"
                          onClick={() => {
                            setEditingId(null);
                            setSelectedType("postgres");
                            setFormData({
                              name: "",
                              host: "localhost",
                              port: DEFAULT_PORTS["postgres"],
                              user: "",
                              password: "",
                              database: "",
                              description: "",
                              uri: "",
                            });
                            setIsCreateModalOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Create Connection
                        </Button>
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 bg-white dark:bg-background border-slate-200 dark:border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-accent"
                      onClick={() => refetch()}
                      disabled={isFetching}
                    >
                      <RotateCw
                        className={cn("h-4 w-4", isFetching && "animate-spin")}
                      />
                    </Button>
                  </div>
                </div>

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
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this connection? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

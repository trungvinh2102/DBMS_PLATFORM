/**
 * @file ConnectionDialog.tsx
 * @description Dialog component for creating new database connections.
 */

import { Database, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DB_TYPES } from "./constants";
import { ConnectionManualForm } from "./ConnectionManualForm";
import { ConnectionURIForm } from "./ConnectionURIForm";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";

interface ConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  creationMode: "form" | "uri";
  setCreationMode: (mode: "form" | "uri") => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  trigger?: React.ReactElement;
}

export function ConnectionDialog({
  isOpen,
  onOpenChange,
  creationMode,
  setCreationMode,
  selectedType,
  setSelectedType,
  formData,
  setFormData,
  onSubmit,
  isPending,
  trigger,
}: ConnectionDialogProps) {
  const testConnectionMutation = useMutation(
    trpc.database.testConnection.mutationOptions(),
  );

  const handleTestConnection = async () => {
    try {
      const config =
        creationMode === "uri"
          ? { uri: formData.uri }
          : {
              host: formData.host,
              port: parseInt(formData.port),
              user: formData.user,
              password: formData.password,
              database: formData.database,
            };

      const result = await testConnectionMutation.mutateAsync({
        type: selectedType,
        config,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to test connection");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger || (
            <Button className="h-10 bg-blue-600 hover:bg-blue-700 text-white gap-2 px-4 shadow-sm font-semibold">
              <Plus className="h-4 w-4" />
              Create Connection
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-background border border-slate-200 dark:border-border shadow-2xl rounded-2xl p-0 overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Create New Connection
              </DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Configure your database credentials and access settings.
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 rounded-lg">
              <button
                type="button"
                onClick={() => setCreationMode("form")}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-semibold transition-all rounded-md",
                  creationMode === "form"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
                )}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("uri")}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-semibold transition-all rounded-md",
                  creationMode === "uri"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
                )}
              >
                URI
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {DB_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl transition-all gap-2 group relative",
                  selectedType === t.id
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                <span
                  className={cn(
                    "text-2xl transition-transform duration-300 group-hover:scale-110",
                    t.color,
                  )}
                >
                  {t.icon}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-tight text-center",
                    selectedType === t.id
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {t.name}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Connection Name
                </Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="h-11 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500 transition-all placeholder:text-slate-400"
                  placeholder="e.g. Production Cluster"
                />
              </div>
            </div>

            {creationMode === "form" ? (
              <ConnectionManualForm
                formData={formData}
                setFormData={setFormData}
              />
            ) : (
              <ConnectionURIForm
                formData={formData}
                setFormData={setFormData}
                selectedType={selectedType}
              />
            )}

            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                className="h-10 px-4 font-semibold text-sm border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2"
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    testConnectionMutation.isPending
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-emerald-500",
                  )}
                />
                {testConnectionMutation.isPending
                  ? "Testing..."
                  : "Test Connection"}
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="font-semibold text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-10 px-6 font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
                >
                  {isPending ? "Creating..." : "Save Connection"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

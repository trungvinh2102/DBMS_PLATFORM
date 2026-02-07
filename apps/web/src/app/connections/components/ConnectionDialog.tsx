/**
 * @file ConnectionDialog.tsx
 * @description Dialog component for creating new database connections.
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DB_TYPES, DEFAULT_PORTS } from "./constants";
import { ConnectionForm } from "./ConnectionForm";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";

interface ConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
      // Build config from form data - send both URI and individual fields
      const config = {
        uri: formData.uri,
        host: formData.host,
        port: parseInt(formData.port) || undefined,
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

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    // Update port to default for the new type
    setFormData({
      ...formData,
      port: DEFAULT_PORTS[newType] || formData.port,
    });
  };

  // Get the icon for selected type
  const selectedDbType = DB_TYPES.find((t) => t.id === selectedType);

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
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-background border border-slate-200 dark:border-border shadow-2xl rounded-2xl p-0 overflow-hidden h-[90vh] flex flex-col">
        <div className="p-8 pb-4 shrink-0">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Create New Connection
            </DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Configure your database credentials and access settings.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-8 space-y-6">
            {/* Database Type Select */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
                Database Type
              </Label>
              <Select
                value={selectedType}
                onValueChange={(value) => value && handleTypeChange(value)}
              >
                <SelectTrigger className="h-12 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80 transition-all focus:ring-blue-500">
                  <SelectValue placeholder="Select database type">
                    <div className="flex items-center gap-3">
                      {selectedDbType && (
                        <span className={cn("text-xl", selectedDbType.color)}>
                          {selectedDbType.icon}
                        </span>
                      )}
                      <span>{selectedDbType?.name || "Select type"}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0c0c0e] border-slate-200 dark:border-white/10 shadow-2xl">
                  {DB_TYPES.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      className="font-medium py-3 focus:bg-slate-50 dark:focus:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xl", t.color)}>{t.icon}</span>
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Connection Name */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
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
                className="h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80 focus-visible:ring-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-white/10"
                placeholder="e.g. Production Cluster"
              />
            </div>
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
                Description
              </Label>
              <Textarea
                placeholder="Brief reason for connection or database documentation..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="min-h-20 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-[11px] focus-visible:ring-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-white/10 resize-none"
              />
            </div>
            {/* Connection Form */}
            <ConnectionForm
              formData={formData}
              setFormData={setFormData}
              selectedType={selectedType}
            />
            <div className="pb-4" />{" "}
            {/* Extra spacing at bottom of scroll area */}
          </div>

          {/* Persistent Footer */}
          <div className="shrink-0 p-8 pt-6 border-t border-slate-100 dark:border-border bg-white dark:bg-background rounded-b-2xl">
            <div className="flex items-center justify-between">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

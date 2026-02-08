/**
 * @file ConnectionsHeader.tsx
 * @description Header component for the Connections list, including search, filter, and action buttons.
 */

import { Search, Filter, Plus, RotateCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionDialog } from "./ConnectionDialog";
import { cn } from "@/lib/utils";
import { DEFAULT_PORTS } from "./constants";

interface ConnectionsHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  isFetching: boolean;
  refetch: () => void;
  setEditingId: (id: string | null) => void;
}

export function ConnectionsHeader({
  searchQuery,
  setSearchQuery,
  isCreateModalOpen,
  setIsCreateModalOpen,
  selectedType,
  setSelectedType,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  isFetching,
  refetch,
  setEditingId,
}: ConnectionsHeaderProps) {
  return (
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
          onSubmit={onSubmit}
          isPending={isSaving}
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
          <RotateCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}

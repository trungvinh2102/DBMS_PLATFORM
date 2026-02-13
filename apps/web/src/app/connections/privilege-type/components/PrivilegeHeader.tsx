/**
 * @file PrivilegeHeader.tsx
 * @description Header component for the Privilege Type page, including title, search, and action buttons.
 */

import { Shield, Plus, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_ORDER, CATEGORY_CONFIG } from "../constants";

interface PrivilegeHeaderProps {
  privilegeCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  onAddPrivilege: () => void;
  onSeedDefaults: () => void;
  isSeedPending: boolean;
}

export function PrivilegeHeader({
  privilegeCount,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  onAddPrivilege,
  onSeedDefaults,
  isSeedPending,
}: PrivilegeHeaderProps) {
  return (
    <div className="p-8 pb-0 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Privilege Types
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enterprise-grade Privilege Type Registry • {privilegeCount}{" "}
                types across {CATEGORY_ORDER.length} categories
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {privilegeCount === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSeedDefaults}
              disabled={isSeedPending}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Seed Defaults
            </Button>
          )}
          <Button
            size="sm"
            onClick={onAddPrivilege}
            className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Privilege
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search privileges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
          />
        </div>
        <Select
          value={filterCategory}
          onValueChange={(v) => setFilterCategory(v || "ALL")}
        >
          <SelectTrigger className="w-52 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORY_ORDER.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_CONFIG[cat]?.label || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

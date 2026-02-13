/**
 * @file PrivilegeCategoryCard.tsx
 * @description Accordion style card component for displaying privilege types within a category.
 */

import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_CONFIG } from "../constants";
import type { PrivilegeType } from "../types";

interface PrivilegeCategoryCardProps {
  category: string;
  items: PrivilegeType[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (item: PrivilegeType) => void;
  onDelete: (item: PrivilegeType) => void;
}

export function PrivilegeCategoryCard({
  category,
  items,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: PrivilegeCategoryCardProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SYSTEM;

  return (
    <Card
      className={`border ${config.borderColor} overflow-hidden transition-all py-0!`}
    >
      <CardHeader
        className={`${config.bgColor} cursor-pointer select-none py-4`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.color} ${config.bgColor}`}
            >
              {config.icon}
            </div>
            <div>
              <CardTitle className={`text-base ${config.color}`}>
                {config.label}
              </CardTitle>
              <CardDescription className="text-xs">
                {items.length} privilege{items.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
          />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-6 py-3.5 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs shrink-0 ${config.color} ${config.borderColor}`}
                  >
                    {item.code}
                  </Badge>
                  <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {item.description || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

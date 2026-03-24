/**
 * @file ExportDropdown.tsx
 * @description Dropdown component for exporting SQL query results in various formats (CSV, Excel).
 */

import React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportData } from "@/lib/export";

interface ExportDropdownProps {
  results: any[];
  columns: string[];
  encoding?: string;
}

export function ExportDropdown({ results, columns, encoding }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-7 px-2 font-black text-[9px] gap-1.5 opacity-60 hover:opacity-100 uppercase tracking-widest",
        )}
      >
        <Download className="h-3.5 w-3.5" /> Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => exportData(results, columns, "csv", "query_results", encoding)}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportData(results, columns, "xlsx", "query_results", encoding)}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Export as Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * @file DataTabView.tsx
 * @description Component for previewing data of a selected table or view in the object panel.
 */

import React from "react";
import { Database, Loader2 } from "lucide-react";
import { SQLLabDataTable } from "../SQLLabDataTable";

export function DataTabView({
  loadingTData,
  currentTData,
  currentTColumns,
  allColumns,
  onSave,
}: any) {
  if (loadingTData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin opacity-20" />
      </div>
    );
  }
  if (currentTData.length > 0) {
    return (
      <SQLLabDataTable 
        columns={currentTColumns} 
        data={currentTData} 
        columnMetadata={allColumns}
        onSave={onSave}
        editable
        mini 
      />
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-4 text-muted-foreground/20">
      <Database className="h-10 w-10" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
        No Data Preview
      </p>
    </div>
  );
}

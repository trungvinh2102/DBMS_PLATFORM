"use client";

import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { SchemaVisualizer } from "./SchemaVisualizer";
import { useSchemaMetadata } from "../hooks/use-schema-metadata";

interface SchemaContentProps {
  databaseId: string;
  schema: string;
  dataSources: any[];
}

export function SchemaContent({ databaseId, schema, dataSources }: SchemaContentProps) {
  const { tables, columns, foreignKeys, isLoading, isError, refetch } = useSchemaMetadata({
    databaseId,
    schema,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-primary/40 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <span className="text-[11px] font-black uppercase tracking-widest">Synthesizing Schema...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500/60 p-12 text-center">
        <AlertTriangle className="h-12 w-12 mb-6" />
        <p className="text-sm font-black uppercase tracking-widest">Schema Analysis Failed</p>
        <p className="text-xs mt-2 font-medium opacity-70">
          The database schema could not be retrieved. Ensure your connection is active.
        </p>
        <button
          onClick={refetch}
          className="mt-6 px-6 py-2 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  const ds = dataSources?.find((d: any) => d.id === databaseId);

  return (
    <SchemaVisualizer 
      tables={tables} 
      columns={columns} 
      foreignKeys={foreignKeys} 
      databaseName={ds?.databaseName || "Database"}
    />
  );
}

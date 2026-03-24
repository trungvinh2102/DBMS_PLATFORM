import { Info, Database, Loader2, Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SQLLabDataTable } from "./SQLLabDataTable";
import { cn } from "@/lib/utils";
import React, { lazy, Suspense } from "react";
const Editor = lazy(() => import("@monaco-editor/react"));

export function EmptyObjectSelection() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <div className="flex flex-col items-center justify-center p-16 gap-6 rounded-3xl border-2 border-dashed border-border/40 bg-muted/5 max-w-sm mx-auto transition-all hover:bg-muted/10 group">
        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <Info className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60">
            Select an Object
          </p>
          <p className="text-[10px] text-muted-foreground/40 font-medium px-4">
            Pick a table or view from the sidebar to explore its structure and data.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DataTabView({
  loadingTData,
  currentTData,
  currentTColumns,
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
      <SQLLabDataTable columns={currentTColumns} data={currentTData} mini />
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

export function StructureTabView({
  isLoadingColumns,
  columnsData,
  structureSearch,
  setStructureSearch,
}: any) {
  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          Schema Definition
        </h4>
        <Badge
          variant="outline"
          className="text-[9px] font-black h-5 rounded-sm px-2 border-primary/20 text-primary/60"
        >
          DDL
        </Badge>
      </div>

      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Search columns..."
          className="w-full h-8 pl-8 pr-3 text-[11px] bg-muted/20 border border-border/40 rounded-md focus:outline-none focus:border-primary/40 focus:bg-background transition-colors"
          value={structureSearch}
          onChange={(e) => setStructureSearch(e.target.value)}
        />
      </div>

      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
        {isLoadingColumns ? (
          <div className="space-y-3 opacity-20">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="h-8 bg-muted animate-pulse rounded w-full"
              />
            ))}
          </div>
        ) : (
          columnsData
            ?.filter(
              (col: any) =>
                !structureSearch ||
                col.name
                  .toLowerCase()
                  .includes(structureSearch.toLowerCase()) ||
                col.type.toLowerCase().includes(structureSearch.toLowerCase()),
            )
            .map((col: any) => (
              <div
                key={col.name}
                className="flex items-center justify-between text-[11px] p-3 bg-muted/20 border border-border/50 rounded-lg hover:bg-muted/40 hover:border-border transition-all group shadow-sm dark:shadow-none dark:border-transparent dark:hover:border-border/60"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary/20 border border-primary/40" />
                  <span className="font-mono font-bold text-foreground/70 tracking-tight">
                    {col.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono font-black opacity-70 border-border/60 bg-muted/10 h-5 px-1.5 group-hover:opacity-100 transition-opacity"
                >
                  {col.type}
                </Badge>
              </div>
            ))
        )}
        {(!columnsData || columnsData.length === 0) && (
          <div className="text-center py-10 opacity-30 text-xs italic">
            No columns found
          </div>
        )}
      </div>
    </div>
  );
}

export function IndexTabView({ indexes }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Indexes
      </h4>
      <div className="space-y-3">
        {indexes && indexes.length > 0 ? (
          indexes.map((idx: any) => (
            <div
              key={idx.indexname}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all group"
            >
              <div className="font-bold text-foreground/90 mb-1.5 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50" />
                {idx.indexname}
              </div>
              <div className="font-mono text-muted-foreground text-[10px] break-all bg-muted/30 p-2 rounded border border-border/20">
                {idx.indexdef}
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
            No indexes found
          </div>
        )}
      </div>
    </div>
  );
}

export function RelationTabView({ foreignKeys }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Foreign Keys
      </h4>
      <div className="space-y-3">
        {foreignKeys && foreignKeys.length > 0 ? (
          foreignKeys.map((fk: any) => (
            <div
              key={fk.constraint}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all group"
            >
              <div className="font-bold text-foreground/90 mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500/50" />
                {fk.constraint}
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground bg-muted/30 p-2 rounded border border-border/20">
                <span className="font-mono text-[11px] font-bold text-foreground/70">
                  {fk.column}
                </span>
                <ChevronRight className="h-3 w-3 opacity-40" />
                <span className="font-mono text-[11px]">
                  {fk.foreignTable}.{fk.foreignColumn}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
            No foreign keys found
          </div>
        )}
      </div>
    </div>
  );
}

export function TriggerTabView({ triggers }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Triggers
      </h4>
      <div className="space-y-3">
        {triggers && triggers.length > 0 ? (
          triggers.map((trg: any) => (
            <div
              key={trg}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all flex items-center gap-3"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/50" />
              <div className="font-bold text-[11px] tracking-tight text-foreground/90">
                {trg}
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
            No triggers found
          </div>
        )}
      </div>
    </div>
  );
}

export function InfoTabView({ tableInfo }: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          Table Statistics
        </h4>
        <div className="h-px flex-1 bg-border/40 ml-4" />
      </div>
      {tableInfo ? (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Row Count", value: tableInfo.row_count, color: "text-blue-500" },
            { label: "Total Size", value: tableInfo.total_size, color: "text-purple-500" },
            { label: "Data Size", value: tableInfo.data_size, color: "text-emerald-500" },
            { label: "Index Size", value: tableInfo.index_size, color: "text-orange-500" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all group"
            >
              <div className="text-[10px] opacity-60 uppercase font-black tracking-wider mb-1 group-hover:opacity-100 transition-opacity">
                {item.label}
              </div>
              <div className={cn("text-lg font-mono font-bold mt-1 tracking-tight", item.color)}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
          No info available
        </div>
      )}
    </div>
  );
}

export function ScriptTabView({ tableDDL, monacoTheme }: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-muted/5 flex justify-between items-center shrink-0">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          DDL Script
        </h4>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {tableDDL ? (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>}>
            <Editor
            height="100%"
            language="sql"
            theme={monacoTheme}
            value={tableDDL}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
              padding: { top: 16, bottom: 16 },
            }}
          />
        </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <pre className="text-xs font-mono text-muted-foreground/50 italic whitespace-pre-wrap select-text">
              -- No DDL available
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

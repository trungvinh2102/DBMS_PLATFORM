import { Info, Database, Loader2, Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SQLLabDataTable } from "./SQLLabDataTable";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function EmptyObjectSelection() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-16 text-center gap-6 text-muted-foreground/10">
      <Info className="h-16 w-16" />
      <p className="text-xs font-black uppercase tracking-[0.3em]">
        Pick an Object
      </p>
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
                className="flex items-center justify-between text-[11px] p-3 bg-muted/20 border border-transparent rounded-lg hover:bg-muted/40 hover:border-border/60 transition-all group"
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
      <div className="space-y-2">
        {indexes && indexes.length > 0 ? (
          indexes.map((idx: any) => (
            <div
              key={idx.indexname}
              className="p-3 bg-muted/20 border border-border/30 rounded-lg text-xs"
            >
              <div className="font-bold text-foreground/90 mb-1">
                {idx.indexname}
              </div>
              <div className="font-mono text-muted-foreground text-[10px] break-all">
                {idx.indexdef}
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic">
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
      <div className="space-y-2">
        {foreignKeys && foreignKeys.length > 0 ? (
          foreignKeys.map((fk: any) => (
            <div
              key={fk.constraint}
              className="p-3 bg-muted/20 border border-border/30 rounded-lg text-xs"
            >
              <div className="font-bold text-foreground/90 mb-1">
                {fk.constraint}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-[11px]">{fk.column}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-mono">
                  {fk.foreignTable}.{fk.foreignColumn}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic">
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
      <div className="space-y-2">
        {triggers && triggers.length > 0 ? (
          triggers.map((trg: any) => (
            <div key={trg} className="p-3 bg-muted/20 rounded-lg text-xs">
              <div className="font-bold">{trg}</div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic">
            No triggers found
          </div>
        )}
      </div>
    </div>
  );
}

export function InfoTabView({ tableInfo }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Table Statistics
      </h4>
      {tableInfo ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="text-[10px] opacity-50 uppercase font-black">
              Row Count
            </div>
            <div className="text-lg font-mono font-bold mt-1">
              {tableInfo.row_count}
            </div>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="text-[10px] opacity-50 uppercase font-black">
              Total Size
            </div>
            <div className="text-lg font-mono font-bold mt-1">
              {tableInfo.total_size}
            </div>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="text-[10px] opacity-50 uppercase font-black">
              Data Size
            </div>
            <div className="text-lg font-mono font-bold mt-1">
              {tableInfo.data_size}
            </div>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="text-[10px] opacity-50 uppercase font-black">
              Index Size
            </div>
            <div className="text-lg font-mono font-bold mt-1">
              {tableInfo.index_size}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground/40 text-xs italic">
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

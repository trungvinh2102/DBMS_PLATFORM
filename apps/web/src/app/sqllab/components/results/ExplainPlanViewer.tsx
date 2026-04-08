import React, { useMemo } from "react";
import { Zap, Server, FileJson, Clock, Database, ChevronRight, Activity, TreePine, BarChart3, Info } from "lucide-react";

interface ExplainPlanViewerProps {
  planData: any;
  dialect?: string;
}

export function ExplainPlanViewer({ planData, dialect = "postgresql" }: ExplainPlanViewerProps) {
  // If the plan is JSON from Postgres
  const isPostgresJson = dialect === "postgresql" && typeof planData === "object" && planData !== null;

  if (isPostgresJson) {
    const plan = Array.isArray(planData) ? planData[0]?.Plan : planData?.Plan;
    if (plan) {
      return (
        <div className="h-full overflow-y-auto scrollbar-thin p-4 font-mono text-xs bg-muted/5">
           <div className="mb-4 flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px]">
             <Activity className="h-4 w-4" />
             <h2>PostgreSQL Execution Plan</h2>
           </div>
           
           <div className="border border-border/50 rounded-md bg-background/50 overflow-hidden shadow-sm">
             <PostgresPlanNode node={plan} />
           </div>
        </div>
      );
    }
  }

  // SQLite EXPLAIN QUERY PLAN (tree structure)
  if (dialect === "sqlite" && Array.isArray(planData)) {
    return <SQLitePlanViewer nodes={planData} />;
  }

  // DuckDB EXPLAIN ANALYZE (text-based plan)
  if (dialect === "duckdb" && typeof planData === "string") {
    return <DuckDBPlanViewer planText={planData} />;
  }

  // Fallback raw view
  return (
    <div className="h-full overflow-auto scrollbar-thin p-4 bg-muted/5">
      <div className="mb-4 flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-[10px]">
         <FileJson className="h-4 w-4" />
         <h2>Raw Execution Plan ({dialect})</h2>
      </div>
      <pre className="text-[11px] font-mono whitespace-pre-wrap opacity-80 bg-background/50 p-4 border border-border/50 rounded-md shadow-inner">
        {JSON.stringify(planData, null, 2)}
      </pre>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*                   SQLite Plan Viewer                */
/* ─────────────────────────────────────────────────── */

function SQLitePlanViewer({ nodes }: { nodes: any[] }) {
  // Build a tree from flat list using id/parent
  const tree = useMemo(() => {
    const map = new Map<number, any>();
    const roots: any[] = [];
    
    nodes.forEach(n => {
      const node = { ...n, children: [] };
      map.set(n.id, node);
    });
    
    nodes.forEach(n => {
      const node = map.get(n.id);
      if (n.parent === 0 || !map.has(n.parent)) {
        roots.push(node);
      } else {
        map.get(n.parent)?.children.push(node);
      }
    });
    
    return roots.length > 0 ? roots : nodes.map(n => ({ ...n, children: [] }));
  }, [nodes]);

  // Detect scan types for visual hints
  const getNodeType = (detail: string) => {
    const d = (detail || "").toUpperCase();
    if (d.includes("SCAN")) return "scan";
    if (d.includes("SEARCH")) return "search";
    if (d.includes("INDEX")) return "index";
    if (d.includes("SUBQUERY") || d.includes("CORRELATED")) return "subquery";
    if (d.includes("TEMP")) return "temp";
    return "default";
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "scan": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "search": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "index": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "subquery": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      case "temp": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-foreground/70 bg-muted/30 border-border/50";
    }
  };

  const renderNode = (node: any, depth: number = 0) => {
    const nodeType = getNodeType(node.detail);
    const colorClass = getNodeColor(nodeType);
    const isFullScan = (node.detail || "").toUpperCase().includes("SCAN") && !(node.detail || "").toUpperCase().includes("SEARCH");

    return (
      <div key={node.id} className="flex flex-col">
        <div 
          className={`flex items-start gap-3 p-3 hover:bg-muted/20 transition-colors border-b border-border/10`}
          style={{ paddingLeft: `${Math.max(16, depth * 28 + 16)}px` }}
        >
          <div className={`mt-0.5 p-1.5 rounded-md border ${colorClass} shrink-0`}>
            {nodeType === "scan" ? <BarChart3 className="h-3 w-3" /> :
             nodeType === "search" ? <Database className="h-3 w-3" /> :
             nodeType === "index" ? <Zap className="h-3 w-3" /> :
             <Server className="h-3 w-3" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground/90 text-[11px]">{node.detail}</span>
              {isFullScan && (
                <span className="text-[9px] uppercase tracking-widest bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold shrink-0">
                  Full Table Scan
                </span>
              )}
            </div>
          </div>
        </div>
        {node.children?.map((child: any) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 font-mono text-xs bg-muted/5">
      <div className="mb-4 flex items-center gap-2 text-blue-500 font-bold uppercase tracking-widest text-[10px]">
        <TreePine className="h-4 w-4" />
        <h2>SQLite Query Plan</h2>
      </div>
      <div className="border border-border/50 rounded-md bg-background/50 overflow-hidden shadow-sm">
        {tree.map(node => renderNode(node, 0))}
      </div>
      <div className="mt-4 flex items-start gap-2 text-[10px] text-muted-foreground/50 bg-muted/20 rounded-md p-3 border border-border/30">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          <strong className="text-foreground/60">Tip:</strong> SEARCH indicates an indexed lookup (fast). SCAN indicates a full table scan — consider adding an index.
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*                  DuckDB Plan Viewer                 */
/* ─────────────────────────────────────────────────── */

function DuckDBPlanViewer({ planText }: { planText: string }) {
  const lines = planText.split("\n");

  // Parse DuckDB plan lines for visual highlighting
  const highlightLine = (line: string) => {
    // Operator names (e.g., HASH_JOIN, SEQ_SCAN, FILTER)
    const operatorMatch = line.match(/─+\s*([\w_]+)\s*/);
    const timeMatch = line.match(/(\d+\.?\d*)\s*(s|ms|μs)/i);
    const rowsMatch = line.match(/(\d+)\s*rows?/i);
    
    let highlightClass = "";
    if (line.includes("SEQ_SCAN") || line.includes("TABLE_SCAN")) highlightClass = "text-amber-500";
    else if (line.includes("INDEX") || line.includes("FILTER")) highlightClass = "text-blue-500";
    else if (line.includes("HASH_JOIN") || line.includes("NESTED_LOOP")) highlightClass = "text-purple-500";
    else if (line.includes("PROJECTION") || line.includes("ORDER_BY")) highlightClass = "text-emerald-500";
    else if (line.includes("AGGREGATE") || line.includes("GROUP_BY")) highlightClass = "text-indigo-500";

    return (
      <div className={`${highlightClass || "text-foreground/70"} hover:bg-muted/20 px-4 py-0.5 transition-colors`}>
        <span>{line}</span>
        {timeMatch && (
          <span className="ml-2 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
            {timeMatch[0]}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 font-mono text-xs bg-muted/5">
      <div className="mb-4 flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest text-[10px]">
        <Activity className="h-4 w-4" />
        <h2>DuckDB Execution Plan</h2>
      </div>
      <div className="border border-border/50 rounded-md bg-background/50 overflow-hidden shadow-sm py-2">
        {lines.map((line, i) => (
          <React.Fragment key={i}>{highlightLine(line)}</React.Fragment>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 text-[10px] text-muted-foreground/50 bg-muted/20 rounded-md p-3 border border-border/30">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          <strong className="text-foreground/60">Tip:</strong> DuckDB uses columnar execution. Watch for SEQ_SCAN on large tables — partitioning or filtering early can improve performance.
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*               PostgreSQL Plan Node                  */
/* ─────────────────────────────────────────────────── */

function PostgresPlanNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const isSeqScan = node["Node Type"] === "Seq Scan";
  const cost = node["Total Cost"] || 0;
  const time = node["Actual Total Time"] || 0;
  
  // Highlight bottlenecks
  const isHighCost = cost > 1000;
  const isHighTime = time > 50;
  const showWarning = isSeqScan || isHighCost || isHighTime;

  return (
    <div className="flex flex-col border-b border-border/20 last:border-0 relative">
      <div 
        className={`flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors ${showWarning ? 'bg-amber-500/5' : ''}`}
        style={{ paddingLeft: `${Math.max(12, depth * 24 + 12)}px` }}
      >
        <div className={`mt-0.5 p-1 rounded-sm ${isSeqScan ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
          <Server className="h-3 w-3" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground/90">{node["Node Type"]}</span>
            
            {node["Relation Name"] && (
              <span className="flex items-center gap-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                <Database className="h-2.5 w-2.5 opacity-50" />
                {node["Relation Name"]}
                {node["Alias"] && node["Alias"] !== node["Relation Name"] && ` (${node["Alias"]})`}
              </span>
            )}
            
            {isSeqScan && (
              <span className="text-[9px] uppercase tracking-widest bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-bold shrink-0">
                Missing Index?
              </span>
            )}
            {isHighTime && (
              <span className="text-[9px] uppercase tracking-widest bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold shrink-0">
                Slow Node
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-1.5 text-[10px] opacity-70">
            <span className="flex items-center gap-1">
              Cost: <span className="font-bold text-foreground">{node["Startup Cost"]} .. {node["Total Cost"]}</span>
            </span>
            <span className="flex items-center gap-1">
              Rows: <span className="font-bold text-foreground">{node["Plan Rows"]}</span>
            </span>
            {node["Actual Total Time"] !== undefined && (
              <span className="flex items-center gap-1 text-primary">
                <Clock className="h-2.5 w-2.5" />
                <span className="font-bold">{node["Actual Total Time"]}ms</span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {node.Plans && node.Plans.map((child: any, i: number) => (
        <PostgresPlanNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

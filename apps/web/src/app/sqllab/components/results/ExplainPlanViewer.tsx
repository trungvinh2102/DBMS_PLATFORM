import React, { useMemo } from "react";
import { Zap, Server, FileJson, Clock, Database, ChevronRight, Activity } from "lucide-react";

interface ExplainPlanViewerProps {
  planData: any;
  dialect?: string;
}

export function ExplainPlanViewer({ planData, dialect = "postgresql" }: ExplainPlanViewerProps) {
  // If the plan is JSON from Postgres
  const isPostgresJson = dialect === "postgresql" && typeof planData === "object" && planData !== null;
  // If the plan is JSON from MySQL
  const isMySQLJson = dialect === "mysql" && typeof planData === "object" && planData !== null;

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

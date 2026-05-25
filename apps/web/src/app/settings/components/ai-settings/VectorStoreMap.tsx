/**
 * @file VectorStoreMap.tsx
 * @description Interactive XYFlow map for inspecting QurioDB RAG vector store sources and pipeline stages.
 */

import { type MouseEvent, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Boxes, Database, Loader2, Maximize2, Network, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { aiApi } from "@/lib/api-client";
import {
  buildVectorStoreGraph,
  readableSourceType,
  type RagPipelineStatus,
  type RagSource,
  type RagSourceDetail,
  type RagVectorStatus,
  type VectorStoreGraphNode,
  type VectorStoreGraphNodeData,
  type VectorStoreMapMode,
} from "./vector-store-map-graph";
import { miniMapColor, RagVectorNode, SourceInspector, sourceTypeCounts } from "./VectorStoreMapNodes";

interface VectorStoreMapProps {
  vectorStatus?: RagVectorStatus;
  pipelineStatus?: RagPipelineStatus;
  sources: RagSource[];
  databaseLabels?: Record<string, string>;
  isLoading?: boolean;
  onRefresh: () => void;
}

const nodeTypes = {
  ragVector: RagVectorNode,
};

const modeOptions: Array<{ mode: VectorStoreMapMode; label: string; icon: typeof Boxes }> = [
  { mode: "store", label: "Store", icon: Boxes },
  { mode: "pipeline", label: "Pipeline", icon: Network },
];

export function VectorStoreMap({
  vectorStatus,
  pipelineStatus,
  sources,
  databaseLabels = {},
  isLoading,
  onRefresh,
}: VectorStoreMapProps) {
  const [mode, setMode] = useState<VectorStoreMapMode>("store");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<VectorStoreGraphNode> | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = (resolvedTheme || theme || "light") as "light" | "dark";

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId),
    [selectedSourceId, sources],
  );

  const sourceDetailQuery = useQuery({
    queryKey: ["rag-source-detail", selectedSourceId],
    queryFn: () => aiApi.getRagSource(selectedSourceId),
    enabled: mode === "store" && Boolean(selectedSourceId),
  });

  const expandedSource = sourceDetailQuery.data as RagSourceDetail | undefined;
  const graph = useMemo(() => buildVectorStoreGraph({
    mode,
    vectorStatus,
    pipelineStatus,
    sources,
    databaseLabels,
    expandedSource: mode === "store" ? expandedSource : undefined,
  }), [databaseLabels, expandedSource, mode, pipelineStatus, sources, vectorStatus]);

  const nodes = useMemo(
    () => graph.nodes.map((node) => ({
      ...node,
      selected: node.id === `source:${selectedSourceId}`,
    })),
    [graph.nodes, selectedSourceId],
  );

  const handleNodeClick = (_event: MouseEvent, node: Node<VectorStoreGraphNodeData>) => {
    if (node.data.kind === "source") {
      setMode("store");
      setSelectedSourceId(node.id.replace(/^source:/, ""));
    }
  };

  const hasPipeline = Boolean(pipelineStatus?.stages?.length);
  const selectedChunkCount = expandedSource?.chunks?.length || 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border/50 bg-background/60">
      <div className="flex flex-col gap-4 border-b border-border/50 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold">Vector Store Map</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              <span>{vectorStatus?.backend || "sqlite_json"}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span>{sources.length} sources</span>
              {selectedChunkCount > 0 ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>{selectedChunkCount} chunks</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/50 bg-muted/20 p-1">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.mode}
                  type="button"
                  variant={mode === option.mode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-9 gap-2 rounded-md px-3 text-[11px] font-black uppercase tracking-widest"
                  disabled={option.mode === "pipeline" && !hasPipeline}
                  onClick={() => setMode(option.mode)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => flowInstance?.fitView({ padding: 0.12, duration: 240 })}
                  aria-label="Fit vector store map"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Fit map</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={onRefresh}
                  aria-label="Refresh vector store map"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Refresh map</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid min-h-[760px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="relative min-h-[720px] xl:min-h-[760px] bg-muted/5">
          {isLoading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
            minZoom={0.12}
            maxZoom={2.2}
            colorMode={currentTheme}
            proOptions={{ hideAttribution: true }}
            panActivationKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            deleteKeyCode={null}
            nodesDraggable={false}
            onInit={setFlowInstance}
            onNodeClick={handleNodeClick}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1.2}
              color={currentTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.16)"}
            />
            <MiniMap
              pannable
              zoomable
              ariaLabel="Vector store map overview"
              nodeBorderRadius={7}
              nodeColor={(node) => miniMapColor((node as VectorStoreGraphNode).data.kind)}
              className="hidden h-36 w-56 border border-border/60 bg-background/90 shadow-lg lg:block"
            />
            <Controls className="bg-background! border-border! shadow-lg! [&_path]:fill-foreground!" />
          </ReactFlow>
        </div>

        <aside className="border-t border-border/50 bg-muted/10 lg:border-l lg:border-t-0">
          <ScrollArea className="h-[720px] xl:h-[760px]">
            <div className="space-y-5 p-4">
              <div>
                <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  Selection
                </div>
                {selectedSource ? (
                  <SourceInspector
                    source={selectedSource}
                    detail={expandedSource}
                    databaseLabels={databaseLabels}
                    isLoading={sourceDetailQuery.isFetching}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/60 p-5 text-center text-sm text-muted-foreground">
                    No source selected.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  Source Types
                </div>
                <div className="space-y-2">
                  {sourceTypeCounts(sources).map((item) => (
                    <div key={item.type} className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 px-3 py-2.5">
                      <span className="truncate text-sm font-semibold">{readableSourceType(item.type)}</span>
                      <Badge variant="outline" className="rounded-md text-[10px] font-bold">
                        {item.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </section>
  );
}

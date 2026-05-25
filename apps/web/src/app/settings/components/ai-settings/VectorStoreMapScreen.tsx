/**
 * @file VectorStoreMapScreen.tsx
 * @description Standalone AI settings screen for inspecting the RAG vector store graph.
 */

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { aiApi, databaseApi } from "@/lib/api-client";
import { VectorStoreMap } from "./VectorStoreMap";
import type { RagPipelineStatus, RagSource } from "./vector-store-map-graph";

const getDatabaseLabel = (database: any) => database.databaseName || database.name || database.id;

export function VectorStoreMapScreen() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["rag-status"],
    queryFn: () => aiApi.getRagStatus(),
  });

  const pipelineStatusQuery = useQuery({
    queryKey: ["rag-pipeline-status"],
    queryFn: () => aiApi.getRagPipelineStatus(),
  });

  const sourcesQuery = useQuery({
    queryKey: ["rag-sources"],
    queryFn: () => aiApi.getRagSources(),
  });

  const databasesQuery = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const databaseLabels = useMemo(() => {
    return Object.fromEntries(
      (databasesQuery.data || []).map((database: any) => [database.id, getDatabaseLabel(database)]),
    );
  }, [databasesQuery.data]);

  const refreshMap = () => {
    queryClient.invalidateQueries({ queryKey: ["rag-sources"] });
    queryClient.invalidateQueries({ queryKey: ["rag-status"] });
    queryClient.invalidateQueries({ queryKey: ["rag-pipeline-status"] });
    queryClient.invalidateQueries({ queryKey: ["rag-source-detail"] });
    queryClient.invalidateQueries({ queryKey: ["databases"] });
  };

  return (
    <VectorStoreMap
      vectorStatus={statusQuery.data?.vectorStore}
      pipelineStatus={pipelineStatusQuery.data as RagPipelineStatus | undefined}
      sources={(sourcesQuery.data || []) as RagSource[]}
      databaseLabels={databaseLabels}
      isLoading={
        sourcesQuery.isLoading
        || statusQuery.isLoading
        || pipelineStatusQuery.isLoading
        || databasesQuery.isLoading
      }
      onRefresh={refreshMap}
    />
  );
}

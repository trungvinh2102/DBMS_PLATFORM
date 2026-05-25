/**
 * @file vector-store-map-graph.test.ts
 * @description Unit tests for RAG vector store map graph construction.
 */

import { describe, expect, it } from "vitest";

import {
  buildVectorStoreGraph,
  readableSourceType,
  type RagSource,
} from "@/app/settings/components/ai-settings/vector-store-map-graph";

const sources: RagSource[] = [
  {
    id: "database_schema:db-1:public",
    sourceType: "database_schema",
    databaseId: "db-1",
    title: "public schema",
    status: "indexed",
    accessScope: "database",
  },
  {
    id: "saved_query:query-1",
    sourceType: "saved_query",
    databaseId: "db-1",
    title: "Top customers",
    status: "indexed",
    accessScope: "user",
  },
];

describe("buildVectorStoreGraph", () => {
  it("groups vector store sources by source type", () => {
    const graph = buildVectorStoreGraph({
      mode: "store",
      vectorStatus: { backend: "sqlite_json", enabled: true },
      sources,
      databaseLabels: { "db-1": "Analytics Warehouse" },
    });
    const databaseSchemaNode = graph.nodes.find((node) => node.id === "source:database_schema:db-1:public");

    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      "rag-backend",
      "source-type:database_schema",
      "source-type:saved_query",
      "source:database_schema:db-1:public",
      "source:saved_query:query-1",
    ]));
    expect(graph.edges.map((edge) => `${edge.source}->${edge.target}`)).toEqual(expect.arrayContaining([
      "rag-backend->source-type:database_schema",
      "source-type:saved_query->source:saved_query:query-1",
    ]));
    expect(databaseSchemaNode?.data.subtitle).toBe("Analytics Warehouse");
  });

  it("expands selected source chunks without exposing raw vectors", () => {
    const graph = buildVectorStoreGraph({
      mode: "store",
      vectorStatus: { backend: "sqlite_vec", enabled: true },
      sources,
      expandedSource: {
        ...sources[0],
        chunks: [
          {
            id: "chunk-1",
            chunkType: "schema_table",
            objectName: "orders",
            schemaName: "public",
            tokenCount: 42,
            ordinal: 0,
          },
        ],
      },
    });

    const chunkNode = graph.nodes.find((node) => node.id === "chunk:chunk-1");

    expect(chunkNode?.data.label).toBe("orders");
    expect(JSON.stringify(graph.nodes)).not.toContain("vectorJson");
    expect(JSON.stringify(graph.nodes)).not.toContain("embedding");
  });

  it("centers expanded sources beside their chunk stack", () => {
    const graph = buildVectorStoreGraph({
      mode: "store",
      vectorStatus: { backend: "sqlite_vec", enabled: true },
      sources,
      expandedSource: {
        ...sources[0],
        chunks: [
          { id: "chunk-1", chunkType: "schema_table", objectName: "orders", ordinal: 0 },
          { id: "chunk-2", chunkType: "schema_table", objectName: "customers", ordinal: 1 },
          { id: "chunk-3", chunkType: "schema_table", objectName: "invoices", ordinal: 2 },
        ],
      },
    });

    const sourceNode = graph.nodes.find((node) => node.id === "source:database_schema:db-1:public");
    const chunkNodes = graph.nodes
      .filter((node) => node.id.startsWith("chunk:"))
      .sort((left, right) => left.position.y - right.position.y);

    expect(sourceNode?.position.y).toBeGreaterThan(chunkNodes[0].position.y);
    expect(sourceNode?.position.y).toBeLessThan(chunkNodes[2].position.y);
    expect(chunkNodes[1].position.y - chunkNodes[0].position.y).toBeGreaterThan(120);
    expect(chunkNodes[2].position.y - chunkNodes[1].position.y).toBeGreaterThan(120);
  });

  it("creates ordered pipeline stage edges", () => {
    const graph = buildVectorStoreGraph({
      mode: "pipeline",
      vectorStatus: { backend: "sqlite_json", enabled: true },
      sources,
      pipelineStatus: {
        stages: [
          { key: "ingestion", name: "Data ingestion", status: "available" },
          { key: "chunking", name: "Chunking", status: "available" },
        ],
      },
    });

    expect(graph.edges.map((edge) => `${edge.source}->${edge.target}`)).toEqual([
      "rag-backend->stage:ingestion",
      "stage:ingestion->stage:chunking",
    ]);
  });
});

describe("readableSourceType", () => {
  it("formats source type identifiers for labels", () => {
    expect(readableSourceType("query_history")).toBe("Query History");
  });
});

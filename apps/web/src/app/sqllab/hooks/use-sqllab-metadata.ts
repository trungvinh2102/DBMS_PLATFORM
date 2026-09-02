/**
 * @file use-sqllab-metadata.ts
 * @description Hook to fetch and manage database metadata such as schemas, tables, views, functions, and specific table details.
 */

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";

interface MetadataProps {
  selectedDS: string;
  selectedSchema: string;
  selectedTable: string | null;
}

type ColumnsByTable = Record<string, any[]> | any[] | null | undefined;

export function flattenSchemaColumnsForAutocomplete(
  columnsByTable: ColumnsByTable,
) {
  if (Array.isArray(columnsByTable)) return columnsByTable;
  if (!columnsByTable || typeof columnsByTable !== "object") return [];

  return Object.entries(columnsByTable).flatMap(([tableName, columns]) => {
    if (!Array.isArray(columns)) return [];
    return columns.map((column) => ({
      ...column,
      table: column.table ?? column.tableName ?? column.table_name ?? tableName,
      tableName: column.tableName ?? column.table ?? column.table_name ?? tableName,
      table_name: column.table_name ?? column.table ?? column.tableName ?? tableName,
    }));
  });
}

export function useSQLLabMetadata({
  selectedDS,
  selectedSchema,
  selectedTable,
}: MetadataProps) {
  const { data: dataSources = [] } = useQuery({
    queryKey: ["databases"],
    queryFn: async () => {
      const res = await databaseApi.list();
      return (res as any).data || res;
    },
  });

  const {
    data: schemas = [],
    isLoading: isLoadingSchemas,
    error: schemasError,
  } = useQuery({
    queryKey: ["schemas", selectedDS],
    queryFn: () => databaseApi.getSchemas(selectedDS),
    enabled: !!selectedDS,
  });

  const tablesQuery = useQuery({
    queryKey: ["tables", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getTables(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema,
  });
  const tables = (tablesQuery.data as any) || [];

  const viewsQuery = useQuery({
    queryKey: ["views", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getViews(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema,
  });
  const views = (viewsQuery.data as any) || [];

  // Derive selected DS type to optimize query fetching
  const selectedDSType = (dataSources.find((ds: any) => ds.id === selectedDS)?.type || "").toLowerCase();
  const isFileBased = ["sqlite", "duckdb"].includes(selectedDSType);
  const isClickHouse = selectedDSType === "clickhouse";
  const skipFunctionsProcsEvents = isFileBased || isClickHouse;

  const functionsQuery = useQuery({
    queryKey: ["functions", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getFunctions(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !skipFunctionsProcsEvents,
  });
  const functions = skipFunctionsProcsEvents ? [] : ((functionsQuery.data as any) || []);

  const proceduresQuery = useQuery({
    queryKey: ["procedures", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getProcedures(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !skipFunctionsProcsEvents,
  });
  const procedures = skipFunctionsProcsEvents ? [] : ((proceduresQuery.data as any) || []);

  const triggersQuery = useQuery({
    queryKey: ["triggers", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getTriggers(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && selectedDSType !== "duckdb" && !isClickHouse,
  });
  const triggers = (selectedDSType === "duckdb" || isClickHouse) ? [] : ((triggersQuery.data as any) || []);

  const eventsQuery = useQuery({
    queryKey: ["events", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getEvents(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !skipFunctionsProcsEvents,
  });
  const events = skipFunctionsProcsEvents ? [] : ((eventsQuery.data as any) || []);

  const canLoadEngineObjects = !!selectedDS && !["mongodb", "redis"].includes(selectedDSType);
  const materializedViewsQuery = useQuery({
    queryKey: ["materialized-views", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getMaterializedViews(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });
  const sequencesQuery = useQuery({
    queryKey: ["sequences", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getSequences(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });
  const partitionsQuery = useQuery({
    queryKey: ["partitions", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getPartitions(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });
  const rolesQuery = useQuery({
    queryKey: ["roles", selectedDS],
    queryFn: () => databaseApi.getRoles(selectedDS),
    enabled: canLoadEngineObjects,
  });
  const grantsQuery = useQuery({
    queryKey: ["grants", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getGrants(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });
  const tablespacesQuery = useQuery({
    queryKey: ["tablespaces", selectedDS],
    queryFn: () => databaseApi.getTablespaces(selectedDS),
    enabled: canLoadEngineObjects,
  });
  const extensionsQuery = useQuery({
    queryKey: ["extensions", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getExtensions(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });
  const synonymsQuery = useQuery({
    queryKey: ["synonyms", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getSynonyms(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });
  const jobsQuery = useQuery({
    queryKey: ["jobs", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getJobs(selectedDS, selectedSchema),
    enabled: canLoadEngineObjects && !!selectedSchema,
  });

  const metadata = {
    views,
    functions,
    procedures,
    triggers,
    events,
    materializedViews: (materializedViewsQuery.data as any) || [],
    sequences: (sequencesQuery.data as any) || [],
    partitions: (partitionsQuery.data as any) || [],
    roles: (rolesQuery.data as any) || [],
    grants: (grantsQuery.data as any) || [],
    tablespaces: (tablespacesQuery.data as any) || [],
    extensions: (extensionsQuery.data as any) || [],
    synonyms: (synonymsQuery.data as any) || [],
    jobs: (jobsQuery.data as any) || [],
  };

  const indexesQuery = useQuery({
    queryKey: ["indexes", selectedDS, selectedSchema, selectedTable],
    queryFn: () => databaseApi.getIndexes(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !!selectedTable && selectedDSType !== "duckdb",
  });

  const foreignKeysQuery = useQuery({
    queryKey: ["fks", selectedDS, selectedSchema, selectedTable],
    queryFn: () => databaseApi.getForeignKeys(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !!selectedTable && selectedDSType !== "duckdb" && selectedDSType !== "clickhouse",
  });

  const tableInfoQuery = useQuery({
    queryKey: ["tableInfo", selectedDS, selectedSchema, selectedTable],
    queryFn: () => databaseApi.getTableInfo(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !!selectedTable,
  });

  const tableDDLQuery = useQuery({
    queryKey: ["ddl", selectedDS, selectedSchema, selectedTable],
    queryFn: () =>
      databaseApi.getDDL(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !!selectedTable && selectedDSType !== "duckdb",
  });

  const allColumnsQuery = useQuery({
    queryKey: ["columns", selectedDS, selectedSchema, selectedTable],
    queryFn: () =>
      databaseApi.getColumns(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema && !!selectedTable,
  });
  const allColumns = (allColumnsQuery.data as any[]) || [];

  const schemaColumnsQuery = useQuery({
    queryKey: ["all-columns", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getAllColumns(selectedDS, selectedSchema),
    enabled: !!selectedDS && !!selectedSchema,
  });
  // Memoized on the schema metadata source so unchanged data keeps its array
  // identity across unrelated re-renders (SQL text, cursor position updates).
  const autocompleteColumns = useMemo(
    () =>
      flattenSchemaColumnsForAutocomplete(
        schemaColumnsQuery.data as ColumnsByTable,
      ),
    [schemaColumnsQuery.data],
  );

  useEffect(() => {
    const error = schemasError || tablesQuery.error;
    if (error) {
      toast.error(
        (error as any).message || "Failed to fetch database metadata",
      );
    }
  }, [schemasError, tablesQuery.error]);

  const refetchAll = async () => {
    if (selectedTable) {
      await Promise.all([
        indexesQuery.refetch(),
        foreignKeysQuery.refetch(),
        tableInfoQuery.refetch(),
        tableDDLQuery.refetch(),
        allColumnsQuery.refetch(),
      ]);
    }
    await Promise.all([
      tablesQuery.refetch(),
      viewsQuery.refetch(),
      functionsQuery.refetch(),
      proceduresQuery.refetch(),
      triggersQuery.refetch(),
      eventsQuery.refetch(),
      schemaColumnsQuery.refetch(),
      materializedViewsQuery.refetch(),
      sequencesQuery.refetch(),
      partitionsQuery.refetch(),
      rolesQuery.refetch(),
      grantsQuery.refetch(),
      tablespacesQuery.refetch(),
      extensionsQuery.refetch(),
      synonymsQuery.refetch(),
      jobsQuery.refetch(),
    ]);
  };

  return {
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    refetchTables: refetchAll,
    isLoadingTables: tablesQuery.isLoading,
    isFetchingTables: tablesQuery.isFetching,
    isLoadingColumns: allColumnsQuery.isLoading || schemaColumnsQuery.isLoading,
    allColumns,
    autocompleteColumns,
    ...metadata,
    indexes: (indexesQuery.data as any[]) || [],
    foreignKeys: (foreignKeysQuery.data as any[]) || [],
    tableInfo: (tableInfoQuery.data as any) || null,
    tableDDL: (tableDDLQuery.data as string) || "",
    refetchAll,
  };
}

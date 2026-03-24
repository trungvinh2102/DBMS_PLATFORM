/**
 * @file use-sqllab-metadata.ts
 * @description Hook to fetch and manage database metadata such as schemas, tables, views, functions, and specific table details.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";

interface MetadataProps {
  selectedDS: string;
  selectedSchema: string;
  selectedTable: string | null;
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
    enabled: !!selectedDS,
  });
  const tables = (tablesQuery.data as any) || [];

  const viewsQuery = useQuery({
    queryKey: ["views", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getViews(selectedDS, selectedSchema),
    enabled: !!selectedDS,
  });
  const views = (viewsQuery.data as any) || [];

  const functionsQuery = useQuery({
    queryKey: ["functions", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getFunctions(selectedDS, selectedSchema),
    enabled: !!selectedDS,
  });
  const functions = (functionsQuery.data as any) || [];

  const proceduresQuery = useQuery({
    queryKey: ["procedures", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getProcedures(selectedDS, selectedSchema),
    enabled: !!selectedDS,
  });
  const procedures = (proceduresQuery.data as any) || [];

  const triggersQuery = useQuery({
    queryKey: ["triggers", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getTriggers(selectedDS, selectedSchema),
    enabled: !!selectedDS,
  });
  const triggers = (triggersQuery.data as any) || [];

  const eventsQuery = useQuery({
    queryKey: ["events", selectedDS, selectedSchema],
    queryFn: () => databaseApi.getEvents(selectedDS, selectedSchema),
    enabled: !!selectedDS,
  });
  const events = (eventsQuery.data as any) || [];

  const metadata = {
    views,
    functions,
    procedures,
    triggers,
    events,
  };

  const indexesQuery = useQuery({
    queryKey: ["indexes", selectedDS, selectedTable],
    queryFn: () => databaseApi.getIndexes(selectedDS, selectedTable!),
    enabled: !!selectedDS && !!selectedTable,
  });

  const foreignKeysQuery = useQuery({
    queryKey: ["fks", selectedDS, selectedTable],
    queryFn: () => databaseApi.getForeignKeys(selectedDS, selectedTable!),
    enabled: !!selectedDS && !!selectedTable,
  });

  const tableInfoQuery = useQuery({
    queryKey: ["tableInfo", selectedDS, selectedTable],
    queryFn: () => databaseApi.getTableInfo(selectedDS, selectedTable!),
    enabled: !!selectedDS && !!selectedTable,
  });

  const tableDDLQuery = useQuery({
    queryKey: ["ddl", selectedDS, selectedTable],
    queryFn: () =>
      databaseApi.getDDL(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedTable,
  });

  const allColumnsQuery = useQuery({
    queryKey: ["columns", selectedDS, selectedTable],
    queryFn: () =>
      databaseApi.getColumns(selectedDS, selectedTable!, selectedSchema),
    enabled: !!selectedDS && !!selectedTable,
  });
  const allColumns = (allColumnsQuery.data as any[]) || [];

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
    await tablesQuery.refetch();
  };

  return {
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    refetchTables: refetchAll,
    isLoadingTables: tablesQuery.isLoading,
    isLoadingColumns: allColumnsQuery.isLoading,
    allColumns,
    ...metadata,
    indexes: (indexesQuery.data as any[]) || [],
    foreignKeys: (foreignKeysQuery.data as any[]) || [],
    tableInfo: (tableInfoQuery.data as any) || null,
    tableDDL: (tableDDLQuery.data as string) || "",
    refetchAll,
  };
}

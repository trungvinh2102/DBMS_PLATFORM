import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import type { DataSource } from "@/lib/types";
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
      return ((res as any).data || res) as DataSource[];
    },
  });

  const {
    data: schemas = [],
    isLoading: isLoadingSchemas,
    error: schemasError,
  } = useQuery({
    queryKey: ["schemas", selectedDS],
    queryFn: () => databaseApi.getSchemas(selectedDS) as Promise<string[]>,
    enabled: !!selectedDS,
  });

  const tablesQuery = useQuery({
    queryKey: ["tables", selectedDS, selectedSchema],
    queryFn: () =>
      databaseApi.getTables(selectedDS, selectedSchema) as Promise<string[]>,
    enabled: !!selectedDS,
  });
  const tables = (tablesQuery.data as string[]) || [];

  // Views not yet implemented in backend strictly, using tables endpoint for now or empty
  // TODO: Add separate views endpoint if needed or filter tables
  const views = [];

  const allColumnsQuery = useQuery({
    queryKey: ["columns", selectedDS, selectedSchema],
    // Backend doesn't have getAllColumns yet, maybe implement or loop tables?
    // For now returning empty or we need to add endpoint
    queryFn: async () => [],
    enabled: !!selectedDS,
  });
  const allColumns = (allColumnsQuery.data as any[]) || [];

  // Functions, Procedures, Triggers, Events are placeholders in current backend implementation
  // Returns empty arrays safely
  const metadata = {
    views: [],
    functions: [],
    procedures: [],
    triggers: [],
    events: [],
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
    queryFn: () => databaseApi.getDDL(selectedDS, selectedTable!),
    enabled: !!selectedDS && !!selectedTable,
  });

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
    allColumns,
    ...metadata,
    indexes: (indexesQuery.data as any[]) || [],
    foreignKeys: (foreignKeysQuery.data as any[]) || [],
    tableInfo: (tableInfoQuery.data as any) || null,
    tableDDL: (tableDDLQuery.data as string) || "",
    refetchAll,
  };
}

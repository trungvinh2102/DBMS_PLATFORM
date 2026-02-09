/**
 * @file use-sqllab-metadata.ts
 * @description Hook to fetch database metadata (schemas, tables, columns, etc.).
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
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
  const { data: dsData } = useQuery(trpc.database.listDatabases.queryOptions());
  const dataSources =
    (dsData as unknown as import("@/lib/types").DataSource[]) || [];

  const {
    data: schemasData,
    isLoading: isLoadingSchemas,
    error: schemasError,
  } = useQuery({
    ...trpc.database.getSchemas.queryOptions({ databaseId: selectedDS }),
    enabled: !!selectedDS,
  });
  const schemas = (schemasData as string[]) || [];

  const tablesQuery = useQuery({
    ...trpc.database.getTables.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });
  const tables = (tablesQuery.data as string[]) || [];

  const viewsQuery = useQuery({
    ...trpc.database.getViews.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });
  const views = (viewsQuery.data as string[]) || [];

  const allColumnsQuery = useQuery({
    ...trpc.database.getAllColumns.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });
  const allColumns = (allColumnsQuery.data as any[]) || [];

  const functionsQuery = useQuery({
    ...trpc.database.getFunctions.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const proceduresQuery = useQuery({
    ...trpc.database.getProcedures.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const triggersQuery = useQuery({
    ...trpc.database.getTriggers.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const eventsQuery = useQuery({
    ...trpc.database.getEvents.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const metadata = {
    views: views,
    functions: (functionsQuery.data as string[]) || [],
    procedures: (proceduresQuery.data as string[]) || [],
    triggers: (triggersQuery.data as string[]) || [],
    events: (eventsQuery.data as string[]) || [],
  };

  const indexesQuery = useQuery({
    ...trpc.database.getIndexes.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
      table: selectedTable!,
    }),
    enabled: !!selectedDS && !!selectedTable,
  });

  const foreignKeysQuery = useQuery({
    ...trpc.database.getForeignKeys.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
      table: selectedTable!,
    }),
    enabled: !!selectedDS && !!selectedTable,
  });

  const tableInfoQuery = useQuery({
    ...trpc.database.getTableInfo.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
      table: selectedTable!,
    }),
    enabled: !!selectedDS && !!selectedTable,
  });

  const tableDDLQuery = useQuery({
    ...trpc.database.getTableDDL.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
      table: selectedTable!,
    }),
    enabled: !!selectedDS && !!selectedTable,
  });

  useEffect(() => {
    const error = schemasError || tablesQuery.error || allColumnsQuery.error;
    if (error) {
      toast.error(
        (error as any).message || "Failed to fetch database metadata",
      );
    }
  }, [schemasError, tablesQuery.error, allColumnsQuery.error]);

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
    // Always refetch sidebar items too
    await Promise.all([
      tablesQuery.refetch(),
      viewsQuery.refetch(),
      functionsQuery.refetch(),
      proceduresQuery.refetch(),
      eventsQuery.refetch(),
      triggersQuery.refetch(),
    ]);
  };

  return {
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    refetchTables: refetchAll, // Use refetchAll for sidebar too or expose separately if needed
    isLoadingTables: tablesQuery.isLoading,
    allColumns: allColumns || [],
    ...metadata,
    indexes: (indexesQuery.data as any[]) || [],
    foreignKeys: (foreignKeysQuery.data as any[]) || [],
    tableInfo: (tableInfoQuery.data as any) || null,
    tableDDL: (tableDDLQuery.data as string) || "",
    refetchAll,
  };
}

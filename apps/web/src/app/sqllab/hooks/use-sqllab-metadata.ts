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

  const {
    data: tables,
    isLoading: isLoadingTables,
    refetch: refetchTables,
    error: tablesError,
  } = useQuery({
    ...trpc.database.getTables.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: views } = useQuery({
    ...trpc.database.getViews.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: allColumns, error: allColumnsError } = useQuery({
    ...trpc.database.getAllColumns.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: functionsData } = useQuery({
    ...trpc.database.getFunctions.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: proceduresData } = useQuery({
    ...trpc.database.getProcedures.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: triggersData } = useQuery({
    ...trpc.database.getTriggers.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const { data: eventsData } = useQuery({
    ...trpc.database.getEvents.queryOptions({
      databaseId: selectedDS,
      schema: selectedSchema,
    }),
    enabled: !!selectedDS,
  });

  const metadata = {
    views: (views as string[]) || [],
    functions: (functionsData as string[]) || [],
    procedures: (proceduresData as string[]) || [],
    triggers: (triggersData as string[]) || [],
    events: (eventsData as string[]) || [],
  };

  useEffect(() => {
    const error = schemasError || tablesError || allColumnsError;
    if (error) {
      toast.error(
        (error as any).message || "Failed to fetch database metadata",
      );
    }
  }, [schemasError, tablesError, allColumnsError]);

  return {
    dataSources,
    schemas,
    isLoadingSchemas,
    tables,
    refetchTables,
    isLoadingTables,
    allColumns: allColumns || [],
    ...metadata,
  };
}

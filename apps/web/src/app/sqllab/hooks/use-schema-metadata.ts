import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";

interface SchemaMetadataProps {
  databaseId: string;
  schema: string;
}

export function useSchemaMetadata({ databaseId, schema }: SchemaMetadataProps) {
  const tablesQuery = useQuery({
    queryKey: ["tables", databaseId, schema],
    queryFn: () => databaseApi.getTables(databaseId, schema),
    enabled: !!databaseId && !!schema,
  });

  const columnsQuery = useQuery({
    queryKey: ["all-columns", databaseId, schema],
    queryFn: () => databaseApi.getAllColumns(databaseId, schema),
    enabled: !!databaseId && !!schema,
  });

  const foreignKeysQuery = useQuery({
    queryKey: ["all-fks", databaseId, schema],
    queryFn: () => databaseApi.getAllForeignKeys(databaseId, schema),
    enabled: !!databaseId && !!schema,
  });

  const isLoading = tablesQuery.isLoading || columnsQuery.isLoading || foreignKeysQuery.isLoading;
  const isError = tablesQuery.isError || columnsQuery.isError || foreignKeysQuery.isError;

  return {
    tables: (tablesQuery.data as string[]) || [],
    columns: (columnsQuery.data as Record<string, any[]>) || {},
    foreignKeys: (foreignKeysQuery.data as any[]) || [],
    isLoading,
    isError,
    refetch: () => {
      tablesQuery.refetch();
      columnsQuery.refetch();
      foreignKeysQuery.refetch();
    },
  };
}

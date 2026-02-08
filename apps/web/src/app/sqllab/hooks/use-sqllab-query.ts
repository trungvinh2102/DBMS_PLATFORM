/**
 * @file use-sqllab-query.ts
 * @description Hook to manage SQL query execution, formatting, and saving.
 */

import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { format } from "sql-formatter";

interface QueryProps {
  selectedDS: string;
  sql: string;
  onSuccess: (response: any) => void;
  onError: (error: string) => void;
}

export function useSQLLabQuery({
  selectedDS,
  sql,
  onSuccess,
  onError,
}: QueryProps) {
  const runSQLMutation = useMutation(trpc.database.execute.mutationOptions());
  const saveQueryMutation = useMutation(
    trpc.database.saveQuery.mutationOptions(),
  );

  const { data: savedQueries, refetch: refetchSavedQueries } = useQuery({
    ...trpc.database.listSavedQueries.queryOptions({ databaseId: selectedDS }),
    enabled: !!selectedDS,
  });

  const handleRun = useCallback(
    async (sqlOverride?: string) => {
      if (!selectedDS) {
        toast.error("Please connect a database first.");
        return;
      }

      try {
        const response = await runSQLMutation.mutateAsync({
          databaseId: selectedDS,
          sql: sqlOverride || sql,
        });
        onSuccess(response);
      } catch (error: any) {
        const msg = error.message || "Failed to execute query";
        onError(msg);
      } finally {
        queryClient.invalidateQueries({
          queryKey: trpc.database.getQueryHistory.queryKey({
            databaseId: selectedDS,
          }),
        });
      }
    },
    [selectedDS, sql, runSQLMutation, onSuccess, onError],
  );

  const handleFormat = useCallback(
    (currentSql: string, setSql: (s: string) => void) => {
      try {
        const formatted = format(currentSql, { language: "postgresql" });
        setSql(formatted);
      } catch (e) {
        toast.error("Failed to format SQL");
      }
    },
    [],
  );

  const handleStop = useCallback(() => {
    if (runSQLMutation.isPending) {
      runSQLMutation.reset();
      toast.info("Query execution stopped");
    }
  }, [runSQLMutation]);

  return {
    handleRun,
    handleFormat,
    handleStop,
    executing: runSQLMutation.isPending,
    runSQLMutation,
    saveQueryMutation,
    savedQueries: (savedQueries as unknown as any[]) || [],
    refetchSavedQueries,
  };
}

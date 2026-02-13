import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
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
  const queryClient = useQueryClient();

  const runSQLMutation = useMutation({
    mutationFn: (vars: { databaseId: string; sql: string }) =>
      databaseApi.execute(vars.databaseId, vars.sql),
  });

  const saveQueryMutation = useMutation({
    mutationFn: (vars: any) => databaseApi.saveQuery(vars),
  });

  const { data: savedQueries = [], refetch: refetchSavedQueries } = useQuery({
    queryKey: ["savedQueries", selectedDS],
    queryFn: () => databaseApi.listSavedQueries(selectedDS),
    enabled: !!selectedDS,
  });

  const handleRun = useCallback(
    async (sqlOverride?: string) => {
      if (!selectedDS) {
        toast.error("Please connect a database first.");
        return;
      }

      try {
        const response: any = await runSQLMutation.mutateAsync({
          databaseId: selectedDS,
          sql: sqlOverride || sql,
        });

        // Axios returns data in data prop usually, but our client interceptor returns response.data
        // Flask returns { data: [], columns: [], ... }
        onSuccess(response);
      } catch (error: any) {
        const msg = error.message || "Failed to execute query";
        onError(msg);
      } finally {
        queryClient.invalidateQueries({
          queryKey: ["history", selectedDS],
        });
      }
    },
    [selectedDS, sql, runSQLMutation, onSuccess, onError, queryClient],
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
    savedQueries: (savedQueries as any[]) || [],
    refetchSavedQueries,
  };
}

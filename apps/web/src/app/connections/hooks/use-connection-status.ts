/**
 * @file use-connection-status.ts
 * @description Hook managing connection status probing, state transitions, stale response protection, and retry.
 *
 * @example
 * const { status, message, checkedAt, isRetryPending, retry } = useConnectionStatus({ id: "conn-1", type: "postgres" });
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";

export type ConnectionStatus = "checking" | "connected" | "unavailable" | "forbidden";

export interface UseConnectionStatusProps {
  id?: string;
  type?: string;
}

export interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  message: string;
  checkedAt: string | null;
  isRetryPending: boolean;
  retry: () => void;
}

export function useConnectionStatus(connection?: UseConnectionStatusProps): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [message, setMessage] = useState<string>("");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  // Keep track of the active connection ID to prevent stale completions
  const activeIdRef = useRef<string | undefined>(connection?.id);
  activeIdRef.current = connection?.id;

  const runProbe = useCallback(
    async (connId: string, connType: string) => {
      setIsPending(true);
      setStatus("checking");
      setMessage("");

      try {
        const data = await databaseApi.test({ id: connId, type: connType });
        if (connId !== activeIdRef.current) return;

        if (data?.success) {
          setStatus("connected");
          setMessage(data.message || "Connected successfully");
          setCheckedAt("Verified just now");
        } else {
          setStatus("unavailable");
          setMessage(data?.message || "Connection unavailable");
          setCheckedAt(null);
        }
      } catch (error: any) {
        if (connId !== activeIdRef.current) return;

        const httpStatus = error?.status || error?.response?.status;
        if (httpStatus === 401 || httpStatus === 403) {
          setStatus("forbidden");
          setMessage("You do not have permission to test this connection.");
          setCheckedAt(null);
        } else {
          setStatus("unavailable");
          setMessage(error?.message || "Connection unavailable");
          setCheckedAt(null);
        }
      } finally {
        if (connId === activeIdRef.current) {
          setIsPending(false);
        }
      }
    },
    [],
  );

  // Auto-probe when id or type changes (guard against duplicate triggers per id/type)
  const lastProbedRef = useRef<string | null>(null);

  useEffect(() => {
    if (connection?.id && connection?.type) {
      const probeKey = `${connection.id}:${connection.type}`;
      if (lastProbedRef.current !== probeKey) {
        lastProbedRef.current = probeKey;
        runProbe(connection.id, connection.type);
      }
    } else {
      lastProbedRef.current = null;
    }
  }, [connection?.id, connection?.type, runProbe]);

  const retry = useCallback(() => {
    if (connection?.id && connection?.type) {
      runProbe(connection.id, connection.type);
    }
  }, [connection?.id, connection?.type, runProbe]);

  return {
    status,
    message,
    checkedAt,
    isRetryPending: isPending,
    retry,
  };
}

/**
 * @file use-connection-columns.tsx
 * @description Custom hook defining columns for the ConnectionTable.
 */

import { type ColumnDef } from "@tanstack/react-table";
import {
  Terminal,
  Settings2,
  Trash,
  FileText,
  Activity,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DB_TYPES } from "../components/constants";
import { toast } from "sonner";
import { databaseApi } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";

function TestConnectionButton({ conn }: { conn: any }) {
  const testConnectionMutation = useMutation({
    mutationFn: (vars: any) => databaseApi.test(vars),
  });

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await testConnectionMutation.mutateAsync({
        id: conn.id,
      });

      if (result.success) {
        toast.success(`Connection to ${conn.name} successful`);
      } else {
        toast.error(`Connection failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to test connection");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleTest}
      disabled={testConnectionMutation.isPending}
      className={cn(
        "h-8 w-8 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400",
        testConnectionMutation.isPending && "animate-pulse",
      )}
      title="Test Connection"
    >
      <Activity
        className={cn(
          "h-4 w-4",
          testConnectionMutation.isPending && "animate-spin",
        )}
      />
    </Button>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

interface UseConnectionColumnsProps {
  onEdit: (conn: any) => void;
  onDelete: (id: string) => void;
  onUpdate: (conn: any) => void;
}

export function useConnectionColumns({
  onEdit,
  onDelete,
  onUpdate,
}: UseConnectionColumnsProps) {
  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5 border-slate-300 dark:border-slate-600"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5 border-slate-300 dark:border-slate-600"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "databaseName",
      header: () => (
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          Database Name
        </span>
      ),
      cell: ({ row }) => {
        const dbName =
          row.original.databaseName || row.original.config.database || "-";
        return (
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
              <FileText className="h-2 w-2 text-slate-400" />
            </div>
            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {dbName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: () => (
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          Database Type
        </span>
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const dbType =
          DB_TYPES.find((t) => t.id === type) ||
          DB_TYPES.find((t) => t.id === "postgres");

        return (
          <div className="flex items-center gap-2">
            <span className={cn("text-lg", dbType?.color)}>{dbType?.icon}</span>
            <span className="text-[13px] text-slate-600 dark:text-slate-300">
              {dbType?.name || type}
            </span>
          </div>
        );
      },
    },
    {
      id: "username",
      header: () => (
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          Username
        </span>
      ),
      cell: ({ row }) => {
        const username =
          row.original.username || row.original.config?.user || "-";
        return (
          <span className="text-[13px] text-slate-500 dark:text-slate-400">
            {username}
          </span>
        );
      },
    },
    {
      accessorKey: "config",
      header: () => (
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          Host
        </span>
      ),
      cell: ({ row }) => {
        const config = row.getValue("config") as any;
        let host = config?.host || "-";

        if (!config?.host && config?.uri) {
          try {
            const match = config.uri.match(/@([^:/]+)/);
            if (match && match[1]) {
              host = match[1];
            }
          } catch (e) {}
        }

        return (
          <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate max-w-50 block">
            {host}
          </span>
        );
      },
    },
    {
      id: "port",
      header: () => (
        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          Port
        </span>
      ),
      cell: ({ row }) => {
        const config = row.original.config as any;
        let port = config?.port || "-";

        if (!config?.port && config?.uri) {
          try {
            const portMatch = config.uri.match(/@(?:[^:]+):(\d+)/);
            if (portMatch && portMatch[1]) {
              port = portMatch[1];
            }
          } catch (e) {}
        }

        return (
          <div className="text-[13px] text-slate-500 dark:text-slate-400">
            {port}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const conn = row.original;
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <TestConnectionButton conn={conn} />
            <Link href={`/sqllab?ds=${conn.id}` as any}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                title="SQL Lab"
              >
                <Terminal className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdate(conn)}
              className="h-8 w-8 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400"
              title="Edit Connection"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(conn)}
              className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              title="Configure"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conn.id);
              }}
              className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              title="Delete Connection"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return { columns };
}

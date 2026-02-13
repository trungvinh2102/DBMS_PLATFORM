/**
 * @file ConnectionTable.tsx
 * @description Data table component for displaying database connections.
 *
 * @example
 * <ConnectionTable connections={data} onEdit={...} onDelete={...} onUpdate={...} />
 */

import { DataTable } from "@/components/ui/data-table";
import { useConnectionColumns } from "../hooks/use-connection-columns";
import type { DataSource } from "@/lib/types";

interface ConnectionTableProps {
  connections: DataSource[];
  onEdit: (conn: DataSource) => void;
  onDelete: (id: string) => void;
  onUpdate: (conn: DataSource) => void;
}

export function ConnectionTable({
  connections,
  onEdit,
  onDelete,
  onUpdate,
}: ConnectionTableProps) {
  const { columns } = useConnectionColumns({ onEdit, onDelete, onUpdate });

  return (
    <div className="w-full">
      <DataTable columns={columns} data={connections || []} />
    </div>
  );
}

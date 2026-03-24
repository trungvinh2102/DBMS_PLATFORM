/**
 * @file ConnectionTable.tsx
 * @description Data table component for displaying database connections.
 *
 * @example
 * <ConnectionTable connections={data} onEdit={...} onDelete={...} onUpdate={...} />
 */

import { DataTable } from "@/components/ui/data-table";
import { useConnectionColumns } from "../hooks/use-connection-columns";

interface ConnectionTableProps {
  connections: any[];
  onEdit: (conn: any) => void;
  onDelete: (id: string) => void;
  onUpdate: (conn: any) => void;
  onRowSelectionChange?: (selectedIds: string[]) => void;
}

export function ConnectionTable({
  connections,
  onEdit,
  onDelete,
  onUpdate,
  onRowSelectionChange,
}: ConnectionTableProps) {
  const { columns } = useConnectionColumns({ onEdit, onDelete, onUpdate });

  return (
    <div className="w-full h-full overflow-auto">
      <DataTable 
        columns={columns} 
        data={connections || []} 
        onSelectionChange={(rows) => {
          onRowSelectionChange?.(rows.map((row: any) => row.id));
        }}
      />
    </div>
  );
}

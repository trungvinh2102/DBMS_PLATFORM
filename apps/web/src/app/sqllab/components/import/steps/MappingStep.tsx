/**
 * @file MappingStep.tsx
 * @description Third step of the import wizard: mapping file columns to database table columns.
 */

import React from "react";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MappingStepProps {
  columns: string[];
  mapping: Record<string, string>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function MappingStep({ columns, mapping, setMapping }: MappingStepProps) {
  const handleMappingChange = (col: string, newVal: string) => {
    setMapping(prev => ({ ...prev, [col]: newVal }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Column Mapping</h4>
        <p className="text-xs text-muted-foreground">Map file columns to table columns</p>
      </div>
      
      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Source (File)</th>
              <th className="px-4 py-2 text-center w-8"></th>
              <th className="px-4 py-2 text-left font-medium">Destination (Table)</th>
            </tr>
          </thead>
          <tbody>
            {columns.length > 0 ? (
              columns.map((col) => (
                <tr key={col} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{col}</td>
                  <td className="px-4 py-2 text-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </td>
                  <td className="px-4 py-2">
                    <Input 
                      className="h-8 text-xs font-mono"
                      value={mapping[col]} 
                      onChange={(e) => handleMappingChange(col, e.target.value)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                  No columns detected. Mapping will be handled automatically by the backend.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * @file DestinationStep.tsx
 * @description Second step of the import wizard: target database and table configuration.
 */

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface DestinationStepProps {
  dataSources: any[];
  targetDb: string | null;
  setTargetDb: (val: string | null) => void;
  targetSchema: string;
  setTargetSchema: (val: string) => void;
  targetTable: string;
  setTargetTable: (val: string) => void;
  fileFormat: string | null;
  setFileFormat: (val: string | null) => void;
}

export function DestinationStep({
  dataSources,
  targetDb,
  setTargetDb,
  targetSchema,
  setTargetSchema,
  targetTable,
  setTargetTable,
  fileFormat,
  setFileFormat
}: DestinationStepProps) {
  return (
    <div className="space-y-6 max-w-md mx-auto py-8">
      <div className="space-y-2">
        <Label>Target Database</Label>
        <Select value={targetDb || ""} onValueChange={setTargetDb}>
          <SelectTrigger>
            <SelectValue placeholder="Select Database" />
          </SelectTrigger>
          <SelectContent>
            {dataSources?.map((ds: any) => (
              <SelectItem key={ds.id} value={ds.id}>
                {ds.databaseName} ({ds.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Schema</Label>
          <Input 
            value={targetSchema} 
            onChange={(e) => setTargetSchema(e.target.value)}
            placeholder="public"
          />
        </div>
        <div className="space-y-2">
          <Label>Table Name</Label>
          <Input 
            value={targetTable} 
            onChange={(e) => setTargetTable(e.target.value)}
            placeholder="users"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>File Format</Label>
        <Select value={fileFormat || "csv"} onValueChange={setFileFormat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="parquet">Parquet</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

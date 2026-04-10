/**
 * @file ExecutionStep.tsx
 * @description Final step of the import wizard: progress visualization and result reporting.
 */

import React from "react";
import { CheckCircle2, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ExecutionStepProps {
  progress: number;
  loading: boolean;
  fileName: string;
  targetSchema: string;
  targetTable: string;
  onClose: () => void;
}

export function ExecutionStep({ 
  progress, 
  loading, 
  fileName, 
  targetSchema, 
  targetTable, 
  onClose 
}: ExecutionStepProps) {
  const isCompleted = progress === 100;

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-8 py-12">
      <div className="relative">
        <div className={cn(
          "w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-1000",
          isCompleted ? "border-emerald-500 bg-emerald-500/10" : "border-primary/20 border-t-primary animate-spin"
        )}>
          {isCompleted ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          ) : (
            <Database className="h-16 w-16 text-primary/40 animate-pulse" />
          )}
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-between text-sm font-medium">
          <span>{isCompleted ? "Import Completed" : "Processing Data..."}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {isCompleted 
            ? `Successfully loaded data into ${targetSchema}.${targetTable}` 
            : `Uploading and ingesting ${fileName}...`}
        </p>
      </div>

      {isCompleted ? (
        <Button 
          onClick={onClose}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Close Wizard
        </Button>
      ) : (
        loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Please wait while we process the request...</span>
          </div>
        )
      )}
    </div>
  );
}

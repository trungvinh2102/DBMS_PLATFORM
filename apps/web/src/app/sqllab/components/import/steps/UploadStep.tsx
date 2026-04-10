/**
 * @file UploadStep.tsx
 * @description First step of the import wizard: file selection and upload preview.
 */

import React from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (e: React.MouseEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UploadStep({ 
  file, 
  onFileChange, 
  onRemoveFile, 
  fileInputRef 
}: UploadStepProps) {
  return (
    <div 
      className={cn(
        "h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer relative",
        file ? "border-emerald-500/50 bg-emerald-500/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={onFileChange}
        accept=".csv,.json,.parquet"
      />
      
      {file ? (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 relative">
            <FileText className="h-8 w-8 text-emerald-500" />
            <button 
              onClick={onRemoveFile}
              className="absolute -top-1 -right-1 bg-background border rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <h3 className="text-lg font-semibold">{file.name}</h3>
          <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
          <Button className="mt-6" variant="outline">Change File</Button>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Click to browse or drop file</h3>
          <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
            Supports .csv, .json, and .parquet files.
          </p>
        </>
      )}
    </div>
  );
}

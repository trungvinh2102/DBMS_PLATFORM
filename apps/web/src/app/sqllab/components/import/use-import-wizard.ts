/**
 * @file use-import-wizard.ts
 * @description Custom hook to manage the state and logic for the data import wizard,
 * including file handling, navigation, destination settings, and execution polling.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";

export type Step = "upload" | "destination" | "mapping" | "execution";

interface UseImportWizardProps {
  initialDbId?: string;
  initialSchema?: string;
  onSuccess?: () => void;
}

export function useImportWizard({ 
  initialDbId = "", 
  initialSchema = "public", 
  onSuccess 
}: UseImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Destination states
  const [targetDb, setTargetDb] = useState<string | null>(initialDbId || null);
  const [targetSchema, setTargetSchema] = useState<string>(initialSchema);
  const [targetTable, setTargetTable] = useState<string>("");
  const [fileFormat, setFileFormat] = useState<string | null>("csv");
  
  // Mapping states
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update defaults when props change
  useEffect(() => {
    if (initialDbId) setTargetDb(initialDbId);
    if (initialSchema) setTargetSchema(initialSchema);
  }, [initialDbId, initialSchema]);

  const handleFileChange = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    // Sanitize table name from file name
    const sanitizedName = selectedFile.name
      .split('.')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase();
    setTargetTable(sanitizedName);
    
    // Auto-detect format
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, string> = {
      'csv': 'csv',
      'json': 'json',
      'parquet': 'parquet',
      'xlsx': 'excel',
      'xls': 'excel'
    };
    if (ext && formatMap[ext]) setFileFormat(formatMap[ext]);
    
    // Extract headers for CSV
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const firstLine = text.split('\n')[0];
        const headers = firstLine.split(',').map(h => h.trim());
        setColumns(headers);
        const initialMapping: Record<string, string> = {};
        headers.forEach(h => { initialMapping[h] = h; });
        setMapping(initialMapping);
      };
      reader.readAsText(selectedFile.slice(0, 10240)); 
    }
  }, []);

  const executeImport = useCallback(async () => {
    if (!file || !targetDb || !targetTable) return;

    setLoading(true);
    setProgress(5);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('databaseId', targetDb || "");
      formData.append('tableName', targetTable);
      formData.append('schemaName', targetSchema);
      formData.append('format', fileFormat || "csv");
      formData.append('mapping', JSON.stringify(mapping));

      const response = await databaseApi.import(formData);
      const jobId = response.job_id;

      if (!jobId) {
        throw new Error("Failed to start import job: No job ID received");
      }

      // Start polling
      const pollInterval = setInterval(async () => {
        try {
          const status = await databaseApi.getImportStatus(jobId);
          
          if (status.status === "completed") {
            clearInterval(pollInterval);
            setProgress(100);
            setLoading(false);
            toast.success(`Successfully imported data into ${targetTable}`);
            onSuccess?.();
          } else if (status.status === "failed") {
            clearInterval(pollInterval);
            setLoading(false);
            setProgress(0);
            toast.error(status.error || "Import failed");
          } else {
            setProgress(status.progress || 10);
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || "Import failed");
      setLoading(false);
      setProgress(0);
    }
  }, [file, targetDb, targetTable, targetSchema, fileFormat, mapping, onSuccess]);

  const handleNext = useCallback(async () => {
    if (currentStep === "upload") {
      if (!file) {
        toast.error("Please select a file first");
        return;
      }
      setCurrentStep("destination");
    } else if (currentStep === "destination") {
      if (!targetDb || !targetTable) {
        toast.error("Database and Table name are required");
        return;
      }
      setCurrentStep("mapping");
    } else if (currentStep === "mapping") {
      setCurrentStep("execution");
      await executeImport();
    }
  }, [currentStep, file, targetDb, targetTable, executeImport]);

  const handleBack = useCallback(() => {
    const stepOrder: Step[] = ["upload", "destination", "mapping", "execution"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    setCurrentStep("upload");
    setFile(null);
    setProgress(0);
    setLoading(false);
  }, []);

  return {
    currentStep,
    file,
    progress,
    loading,
    targetDb,
    setTargetDb,
    targetSchema,
    setTargetSchema,
    targetTable,
    setTargetTable,
    fileFormat,
    setFileFormat,
    columns,
    mapping,
    setMapping,
    fileInputRef,
    handleFileChange,
    handleNext,
    handleBack,
    reset,
  };
}

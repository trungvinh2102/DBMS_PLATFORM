/**
 * @file ImportWizardModal.tsx
 * @description Master component for the Data Import Wizard. 
 * Orchestrates the multi-step process for uploading and ingesting data into SQLLab.
 */

import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useSQLLabContext } from "../../context/SQLLabContext";

// Logic and Steps
import { useImportWizard, Step } from "./use-import-wizard";
import { UploadStep } from "./steps/UploadStep";
import { DestinationStep } from "./steps/DestinationStep";
import { MappingStep } from "./steps/MappingStep";
import { ExecutionStep } from "./steps/ExecutionStep";

interface ImportWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId?: string;
  schemaName?: string;
}

const STEPS_CONFIG: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "upload", label: "Upload File", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "destination", label: "Destination", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "mapping", label: "Mapping", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "execution", label: "Import", icon: <CheckCircle2 className="h-4 w-4" /> },
];

export function ImportWizardModal({ 
  open, 
  onOpenChange, 
  databaseId: initialDbId,
  schemaName: initialSchema 
}: ImportWizardModalProps) {
  const lab = useSQLLabContext();
  
  const {
    currentStep, file, progress, loading,
    targetDb, setTargetDb, targetSchema, setTargetSchema,
    targetTable, setTargetTable, fileFormat, setFileFormat,
    columns, mapping, setMapping, fileInputRef,
    handleFileChange, handleNext, handleBack, reset
  } = useImportWizard({
    initialDbId,
    initialSchema,
    onSuccess: () => lab.refetchTables()
  });

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setTimeout(reset, 300); // Reset after closing animation
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "upload":
        return (
          <UploadStep 
            file={file} 
            onFileChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            onRemoveFile={(e) => { e.stopPropagation(); reset(); }}
            fileInputRef={fileInputRef}
          />
        );
      case "destination":
        return (
          <DestinationStep 
            dataSources={lab.dataSources || []}
            targetDb={targetDb}
            setTargetDb={setTargetDb}
            targetSchema={targetSchema}
            setTargetSchema={setTargetSchema}
            targetTable={targetTable}
            setTargetTable={setTargetTable}
            fileFormat={fileFormat}
            setFileFormat={setFileFormat}
          />
        );
      case "mapping":
        return <MappingStep columns={columns} mapping={mapping} setMapping={setMapping} />;
      case "execution":
        return (
          <ExecutionStep 
            progress={progress}
            loading={loading}
            fileName={file?.name || ""}
            targetSchema={targetSchema}
            targetTable={targetTable}
            onClose={() => handleOpenChange(false)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[1000px] min-h-[600px] flex flex-col p-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex h-full min-h-[600px]">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-muted/30 border-r p-6 flex flex-col gap-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">Import Data</h2>
              <p className="text-xs text-muted-foreground">Load your data into SQLLab</p>
            </div>

            <nav className="space-y-4">
              {STEPS_CONFIG.map((s, i) => {
                const stepIndex = STEPS_CONFIG.findIndex(st => st.id === currentStep);
                const isPast = i < stepIndex;
                const isActive = currentStep === s.id;

                return (
                  <div 
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 text-sm font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/60"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive ? "border-primary bg-primary/10" : "border-muted-foreground/20",
                      isPast && "border-emerald-500 bg-emerald-500/10"
                    )}>
                      {isPast ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="text-[10px]">{i + 1}</div>}
                    </div>
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-6 border-b">
              <DialogTitle className="text-lg">
                {STEPS_CONFIG.find(s => s.id === currentStep)?.label}
              </DialogTitle>
              <DialogDescription>
                Follow the steps to successfully import your data.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 p-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="p-6 border-t flex justify-between bg-muted/10">
              <Button 
                variant="ghost" 
                onClick={handleBack}
                disabled={currentStep === "upload" || (currentStep === "execution" && loading)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={loading && currentStep !== "execution"}
              >
                {loading ? "Processing..." : currentStep === "execution" ? "Finish" : "Continue"}
                {!loading && <ChevronRight className="ml-2 h-4 w-4" />}
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

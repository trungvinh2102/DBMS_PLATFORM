/**
 * @file AISettings.tsx
 * @description Root AI settings component that orchestrates sub-components for provider and model management.
 */

import { useState, useEffect, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettingsActions } from "../context/SettingsActionsContext";

// Sub-components
import { ProviderConfig } from "./ai-settings/ProviderConfig";
import { ModelLibrary } from "./ai-settings/ModelLibrary";
import { AddModelDialog } from "./ai-settings/AddModelDialog";
import { DeleteModelDialog } from "./ai-settings/DeleteModelDialog";
import { AIModel, NewAIModel } from "./ai-settings/types";

/**
 * Main AI Settings component.
 * Adheres to Clean Code standards by modularizing large sections into sub-components.
 */
export function AISettings() {
  const queryClient = useQueryClient();
  const { registerActions } = useSettingsActions();
  
  // State for Provider Config
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("Google");
  
  // State for Add Model Form
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<{id: string, name: string} | null>(null);
  const [newModel, setNewModel] = useState<NewAIModel>({ name: "", modelId: "", provider: "Google", description: "" });

  // 1. Fetch AI Config
  const configQuery = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => aiApi.getAIConfig(),
  });

  // 2. Fetch Available Models
  const modelsQuery = useQuery({
    queryKey: ["ai-models"],
    queryFn: () => aiApi.getModels(),
  });

  // Synchronize local state with fetched config
  useEffect(() => {
    if (configQuery.data) {
      setApiKey(configQuery.data.apiKey || "");
      setProvider(configQuery.data.provider || "Google");
    }
  }, [configQuery.data]);

  // Mutation: Save Provider Config
  const saveConfigMutation = useMutation({
    mutationFn: (data: { apiKey: string; provider: string }) => aiApi.saveAIConfig(data),
    onSuccess: () => {
      toast.success("AI Configuration saved to ecosystem.");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (err: any) => toast.error(`Sync failed: ${err.message}`),
  });

  const handleSaveConfig = useCallback(async () => {
    if (!apiKey) return; // Don't save if empty (or show error if triggered manually)
    await saveConfigMutation.mutateAsync({ apiKey, provider });
  }, [apiKey, provider, saveConfigMutation]);

  const handleReset = useCallback(() => {
    // Reset local state to what's currently in the backend
    if (configQuery.data) {
      setApiKey(configQuery.data.apiKey || "");
      setProvider(configQuery.data.provider || "Google");
    }
    toast.info("AI settings restored to last sync");
  }, [configQuery.data]);

  // Register actions for global buttons
  useEffect(() => {
    registerActions("ai", { 
      onSave: handleSaveConfig,
      onReset: handleReset
    });
  }, [registerActions, handleSaveConfig, handleReset]);

  // Mutation: Add New Model
  const addModelMutation = useMutation({
    mutationFn: (data: any) => aiApi.addModel(data),
    onSuccess: () => {
      toast.success("Neural node registered successfully.");
      setIsAddDialogOpen(false);
      setNewModel({ name: "", modelId: "", provider: "Google", description: "" });
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
    },
    onError: (err: any) => toast.error(`Registration failed: ${err.message}`),
  });

  // Mutation: Delete Model
  const deleteModelMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteModel(id),
    onSuccess: () => {
      toast.success("Neural node de-registered.");
      setIsDeleteDialogOpen(false);
      setModelToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
    },
    onError: (err: any) => toast.error(`De-registration failed: ${err.message}`),
  });

  // Mutation: Reveal API Key
  const revealKeyMutation = useMutation({
    mutationFn: () => aiApi.getAIConfig(true),
    onSuccess: (data) => {
      if (data.apiKey) {
        setApiKey(data.apiKey);
        toast.success("Identity verified. API Key revealed.");
      }
    },
    onError: (err: any) => toast.error(`Verification failed: ${err.message}`),
  });

  const handleAddModel = () => {
    if (!newModel.name || !newModel.modelId) {
      toast.error("Alias and Engine ID are required.");
      return;
    }
    addModelMutation.mutate(newModel);
  };

  const handleDeleteModel = (id: string) => {
    const model = (modelsQuery.data as AIModel[])?.find(m => m.id === id);
    if (model) {
      setModelToDelete({ id: model.id, name: model.name });
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (modelToDelete) {
      deleteModelMutation.mutate(modelToDelete.id);
    }
  };

  return (
    <TooltipProvider delay={200}>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6 pt-1">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
          
          <ProviderConfig 
            apiKey={apiKey}
            setApiKey={setApiKey}
            provider={provider}
            setProvider={setProvider}
            onSave={handleSaveConfig}
            onReveal={() => revealKeyMutation.mutate()}
            isSaving={saveConfigMutation.isPending}
            isRevealing={revealKeyMutation.isPending}
          />

          <ModelLibrary 
            models={modelsQuery.data as AIModel[]}
            isLoading={modelsQuery.isLoading}
            onDelete={handleDeleteModel}
          >
            <AddModelDialog 
              isOpen={isAddDialogOpen}
              setIsOpen={setIsAddDialogOpen}
              newModel={newModel}
              setNewModel={setNewModel}
              onAdd={handleAddModel}
              isAdding={addModelMutation.isPending}
            />
          </ModelLibrary>

          <DeleteModelDialog 
            isOpen={isDeleteDialogOpen}
            setIsOpen={setIsDeleteDialogOpen}
            onConfirm={handleConfirmDelete}
            isDeleting={deleteModelMutation.isPending}
            modelName={modelToDelete?.name || ""}
          />
          
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * @file types.ts
 * @description Type definitions for AI settings components.
 */

export interface AIModel {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  capabilities?: Record<string, boolean | string | number | null>;
}

export interface NewAIModel {
  name: string;
  modelId: string;
  provider: string;
  description: string;
}

export interface AIConfig {
  apiKey: string;
  provider: string;
}

export interface AITaskCatalogItem {
  key: string;
  name: string;
  description: string;
  requiredCapabilities: string[];
  recommendedCapabilities: string[];
}

export interface AITaskAssignment {
  id?: string;
  taskKey: string;
  modelId?: string | null;
  fallbackModelId?: string | null;
  databaseId?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  enabled: boolean;
}

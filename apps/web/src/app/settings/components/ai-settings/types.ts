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

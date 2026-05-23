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

export interface AIRouterTerm {
  id: string;
  termSetId: string;
  termSetKey?: string | null;
  term: string;
  normalizedTerm: string;
  language: string;
  matchType: "phrase" | "token" | "prefix" | "regex" | string;
  weight: number;
  isNegative: boolean;
  enabled: boolean;
  notes?: string | null;
}

export interface AIRouterTermSet {
  id: string;
  key: string;
  behavior: string;
  intent: string;
  ragMode: "none" | "shallow" | "deep" | string;
  reasoningMode: "fast" | "normal" | "deep" | string;
  defaultWeight: number;
  enabled: boolean;
  systemDefined: boolean;
  databaseId?: string | null;
  userId?: string | null;
  terms: AIRouterTerm[];
}

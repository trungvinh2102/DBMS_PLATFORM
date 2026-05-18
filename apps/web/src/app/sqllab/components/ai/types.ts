/**
 * @file types.ts
 * @description Common type definitions for the AI Assistant components.
 */

export interface AIStep {
  type: "thinking";
  content: string;
  name?: string;
  args?: any;
  status?: "active" | "complete";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  explanation?: string;
  thought?: string;
  analysis?: string;
  confidence?: number;
  columns?: string[];
  data?: any[];
  isActionable?: boolean;
  suggestions?: string[];
  steps?: AIStep[];
  isStreaming?: boolean;
}

export interface AIProviderStatus {
  hasApiKey: boolean;
}

export interface AIRuntimeStatus {
  langchain: boolean;
  langgraph: boolean;
  langsmith: boolean;
  anthropic?: boolean;
  hasApiKey: boolean;
  tracingEnabled: boolean;
  project?: string;
  providers?: Record<string, AIProviderStatus>;
}

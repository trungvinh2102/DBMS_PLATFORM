/**
 * @file types.ts
 * @description Common type definitions for the AI Assistant components.
 */

export interface AIStep {
  type: "thinking" | "tool_call";
  content: string;
  name?: string;
  args?: any;
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
}

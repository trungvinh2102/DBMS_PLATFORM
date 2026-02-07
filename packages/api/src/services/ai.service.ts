/**
 * @file ai.service.ts
 * @description Service for handling AI-related tasks like SQL generation, explanation, and optimization.
 */

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { databaseService } from "./database.service";

import type { ColumnInfo } from "../types";

export class AIService {
  private model = google("gemini-2.0-flash");

  /**
   * Generates SQL from a natural language prompt.
   */
  async generateSQL(params: {
    prompt: string;
    databaseId: string;
    schema?: string;
  }) {
    const { prompt, databaseId, schema = "public" } = params;

    // Fetch schema context
    const columns = await databaseService.getAllColumns(databaseId, schema);
    const schemaContext = this.formatSchemaContext(columns);

    const systemPrompt = `
      You are an expert SQL developer. Your task is to generate valid SQL queries based on user requests and the provided database schema.
      
      DATABASE SCHEMA:
      ${schemaContext}
      
      RULES:
      1. ONLY output the SQL query inside a markdown code block.
      2. Do NOT provide any explanation unless specifically asked.
      3. Use the provided schema context (tables and columns) strictly.
      4. ONLY generate SELECT queries for data retrieval. Prohibit any destructive operations (INSERT, UPDATE, DELETE, DROP, etc.).
      5. Use standard SQL syntax compatible with the database.
      6. Assume the current timestamp is ${new Date().toISOString()}.
    `;

    const { text } = await generateText({
      model: this.model,
      system: systemPrompt,
      prompt: prompt,
    });

    return { sql: this.extractSQL(text) };
  }

  /**
   * Explains a SQL query in natural language.
   */
  async explainSQL(sql: string) {
    const systemPrompt = `
      You are a technical educator. Explain the following SQL query in plain, easy-to-understand English. 
      Break it down step-by-step (e.g., what tables are used, what filters are applied, and what the final output represents).
    `;

    const { text } = await generateText({
      model: this.model,
      system: systemPrompt,
      prompt: sql,
    });

    return { explanation: text };
  }

  /**
   * Suggests optimizations for a SQL query.
   */
  async optimizeSQL(params: {
    sql: string;
    databaseId: string;
    schema?: string;
  }) {
    const { sql, databaseId, schema = "public" } = params;
    const columns = await databaseService.getAllColumns(databaseId, schema);
    const schemaContext = this.formatSchemaContext(columns);

    const systemPrompt = `
      You are a Database Performance Engineer. Analyze the provided SQL query and suggest optimizations.
      Focus on:
      - Better use of indexes.
      - Avoiding "SELECT *".
      - Improving JOIN efficiency.
      - Better WHERE clause predicates.
      
      SCHEMA CONTEXT:
      ${schemaContext}
      
      OUTPUT FORMAT:
      1. Optimized SQL (in a code block).
      2. Brief explanation of changes.
    `;

    const { text } = await generateText({
      model: this.model,
      system: systemPrompt,
      prompt: sql,
    });

    return { result: text };
  }

  /**
   * Formats columns into a readable schema string for the LLM.
   */
  private formatSchemaContext(columns: ColumnInfo[]) {
    const tables: Record<string, string[]> = {};
    columns.forEach((col) => {
      if (col && col.table) {
        const tableName = col.table as string;
        if (!tables[tableName]) {
          tables[tableName] = [];
        }
        tables[tableName]!.push(`${col.name} (${col.type})`);
      }
    });

    return Object.entries(tables)
      .map(([table, cols]) => `Table "${table}" {\n  ${cols.join(",\n  ")}\n}`)
      .join("\n\n");
  }

  /**
   * Extracts SQL from markdown code blocks.
   */
  private extractSQL(text: string): string {
    const match =
      text.match(/```sql\n([\s\S]*?)\n```/) ||
      text.match(/```\n([\s\S]*?)\n```/);
    return match ? (match[1] || "").trim() : text.trim();
  }
}

export const aiService = new AIService();

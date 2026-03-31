/**
 * @file slash-commands.ts
 * @description Slash command registry and parser for the AI Assistant chat input.
 * Supports commands like /explain, /optimize, /fix, /describe, /chart.
 * Each command defines its action, parameter requirements, and description.
 */

import { FileSearch, Wand2, Wrench, Table2, BarChart2, Zap, type LucideIcon } from "lucide-react";

export interface SlashCommand {
  /** The command trigger (e.g., "/explain") */
  command: string;
  /** Short description shown in autocomplete */
  description: string;
  /** Icon for autocomplete dropdown */
  icon: LucideIcon;
  /** Whether the command requires the editor SQL */
  requiresEditorSQL: boolean;
  /** Whether the command accepts additional arguments */
  acceptsArgs: boolean;
  /** Placeholder hint for args */
  argsHint?: string;
  /** Generate the full prompt to send to the AI agent */
  buildPrompt: (context: CommandContext) => string | null;
}

export interface CommandContext {
  /** Current SQL in the editor */
  editorSQL: string;
  /** Any extra arguments typed after the command */
  args: string;
  /** Selected database type (e.g., "postgresql") */
  databaseType?: string;
  /** Current schema */
  schema?: string;
  /** Last execution error */
  lastError?: string;
}

export interface ParsedCommand {
  /** The matched slash command definition */
  command: SlashCommand;
  /** Any remaining text after the command */
  args: string;
}

/**
 * Registry of all available slash commands.
 * Order determines display priority in autocomplete.
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/explain",
    description: "Explain the current SQL query in the editor",
    icon: FileSearch,
    requiresEditorSQL: true,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      return `Explain this SQL query in detail. Break down each part, explain what it does, and describe the expected output:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``;
    },
  },
  {
    command: "/optimize",
    description: "Suggest optimizations for the current SQL",
    icon: Wand2,
    requiresEditorSQL: true,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      return `Analyze this SQL query for performance issues and suggest optimizations. Consider indexing, query structure, and execution plan impact:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``;
    },
  },
  {
    command: "/fix",
    description: "Fix errors in the current SQL query",
    icon: Wrench,
    requiresEditorSQL: true,
    acceptsArgs: true,
    argsHint: "<error message>",
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      const errorInfo = ctx.args || ctx.lastError || "unknown error";
      return `I have a SQL error: "${errorInfo}"\n\nHere is my current SQL:\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\`\n\nPlease analyze the error, explain what went wrong, and provide a corrected version.`;
    },
  },
  {
    command: "/describe",
    description: "Show table structure and sample data",
    icon: Table2,
    requiresEditorSQL: false,
    acceptsArgs: true,
    argsHint: "<table_name>",
    buildPrompt: (ctx) => {
      const tableName = ctx.args.trim();
      if (!tableName) return null;
      return `Describe the table "${tableName}" in detail. Show its columns, data types, constraints, and relationships. Then show a query to get 5 sample rows and basic statistics (row count, null counts for key columns).`;
    },
  },
  {
    command: "/chart",
    description: "Suggest a chart visualization for the last query results",
    icon: BarChart2,
    requiresEditorSQL: true,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      return `Given this SQL query:\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\`\n\nAnalyze the expected result columns and suggest the best chart type (bar, line, pie, area) for visualizing the data. Explain which columns should be on X-axis and Y-axis, and why this chart type is most effective.`;
    },
  },
  {
    command: "/perf",
    description: "Analyze query performance with EXPLAIN plan",
    icon: Zap,
    requiresEditorSQL: true,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      return `Analyze the performance of this SQL query. First, suggest the EXPLAIN ANALYZE command I should run. Then explain what to look for in the execution plan — seq scans, nested loops, high-cost nodes, and potential missing indexes:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``;
    },
  },
];

/**
 * Parse a chat input to detect if it starts with a slash command.
 * Returns the matched command and any remaining arguments, or null if no match.
 */
export function parseSlashCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  for (const cmd of SLASH_COMMANDS) {
    const cmdTrigger = cmd.command.toLowerCase();
    const inputLower = trimmed.toLowerCase();
    // Match exact command or command followed by space + args
    if (inputLower === cmdTrigger || inputLower.startsWith(cmdTrigger + " ")) {
      const args = trimmed.slice(cmd.command.length).trim();
      return { command: cmd, args };
    }
  }

  return null;
}

/**
 * Filter commands that match a partial input (for autocomplete).
 * E.g., "/ex" matches "/explain", "/op" matches "/optimize".
 */
export function filterCommands(partialInput: string): SlashCommand[] {
  const trimmed = partialInput.trim().toLowerCase();
  if (!trimmed.startsWith("/")) return [];
  if (trimmed === "/") return SLASH_COMMANDS; // Show all commands

  return SLASH_COMMANDS.filter((cmd) =>
    cmd.command.startsWith(trimmed)
  );
}

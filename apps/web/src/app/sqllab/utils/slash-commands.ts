/**
 * @file slash-commands.ts
 * @description Slash command registry and parser for the AI Assistant chat input.
 * Supports /explain, /optimize, /fix, and /suggest.
 */

import { FileSearch, Wand2, Wrench, type LucideIcon } from "lucide-react";

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
  /** Last execution error */
  lastError?: string;
}

export interface ParsedCommand {
  /** The matched slash command definition */
  command: SlashCommand;
  /** Any remaining text after the command */
  args: string;
}

const VIETNAMESE_RESPONSE_INSTRUCTION =
  "Hãy trả lời bằng tiếng Việt có dấu. Chỉ dùng ngôn ngữ khác khi người dùng yêu cầu rõ ràng; giữ nguyên SQL, tên bảng/cột và từ khóa kỹ thuật cần thiết.";

const buildVietnamesePrompt = (prompt: string) =>
  prompt.startsWith(VIETNAMESE_RESPONSE_INSTRUCTION)
    ? prompt
    : `${VIETNAMESE_RESPONSE_INSTRUCTION}\n\n${prompt}`;

const withVietnameseResponse = (command: SlashCommand): SlashCommand => ({
  ...command,
  buildPrompt: (context) => {
    const prompt = command.buildPrompt(context);
    return prompt ? buildVietnamesePrompt(prompt) : null;
  },
});

const filterCommandsByInput = (partialInput: string): SlashCommand[] => {
  const trimmed = partialInput.trim().toLowerCase();
  if (!trimmed.startsWith("/")) return [];
  if (trimmed === "/") return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter((cmd) =>
    cmd.command.startsWith(trimmed)
  );
};

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
      return buildVietnamesePrompt(`Explain this SQL query in detail. Break down each part, explain what it does, and describe the expected output:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``);
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
      return buildVietnamesePrompt(`Analyze this SQL query for performance issues and suggest optimizations. Consider indexing, query structure, and execution plan impact:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``);
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
      return buildVietnamesePrompt(`I have a SQL error: "${errorInfo}"\n\nHere is my current SQL:\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\`\n\nPlease analyze the error, explain what went wrong, and provide a corrected version.`);
    },
  },
  {
    command: "/suggest",
    description: "Generate query suggestions for your database engine",
    icon: Wand2,
    requiresEditorSQL: false,
    acceptsArgs: true,
    argsHint: "<topic: analytics, schema, admin>",
    buildPrompt: (ctx) => {
      const topic = ctx.args.trim() || "general";
      const dbType = ctx.databaseType || "unknown";

      let engineContext = "";
      if (dbType.includes("sqlite")) {
        engineContext = `The user is connected to a **SQLite** database. Provide SQLite-specific query examples including:
- PRAGMA commands (table_info, foreign_key_list, index_list, integrity_check, compile_options)
- Window functions (available in SQLite 3.25+)
- JSON functions (json_extract, json_each, json_group_array - SQLite 3.38+)
- Common Table Expressions (WITH ... AS)
- Date functions using date(), time(), datetime(), strftime()
- EXPLAIN QUERY PLAN for performance analysis
- VACUUM, ANALYZE for maintenance
Do NOT suggest features SQLite doesn't support: stored procedures, events, user management, PIVOT, or file queries.`;
      } else if (dbType.includes("duckdb")) {
        engineContext = `The user is connected to a **DuckDB** database. Provide DuckDB-specific query examples including:
- SUMMARIZE for quick column profiling
- PIVOT / UNPIVOT for reshaping data
- QUALIFY clause for filtering window function results
- read_csv(), read_parquet(), read_json() for file queries
- LIST and STRUCT operations
- String similarity functions (jaro_winkler_similarity, levenshtein)
- System tables: duckdb_settings(), duckdb_extensions(), duckdb_types()
- EXPLAIN ANALYZE for performance
- Advanced window functions and FILTER clause
DuckDB is an analytical database - emphasize its OLAP strengths.`;
      } else if (dbType.includes("clickhouse")) {
        engineContext = `The user is connected to a **ClickHouse** database. Provide ClickHouse-specific query examples including:
- Specific engines: MergeTree, SummingMergeTree, ReplacingMergeTree
- Columnar-specific functions: any(), groupUniqArray(), argMax(), argMin()
- Array functions: arrayMap, arrayFilter, arrayJoin
- Dictionary lookups
- Sample and Final clauses
- EXPLAIN plan analysis
- System tables: system.parts, system.processes, system.mutations
ClickHouse is a column-oriented OLAP database - focus on high-speed aggregation and large-scale data analysis.`;
      } else if (dbType.includes("mongodb")) {
        engineContext = `The user is connected to a **MongoDB** (NoSQL) database. Since this tool primarily generates SQL, please generate **MongoDB Query Language (MQL)** instead within \`\`\`json blocks.
Provide MongoDB-specific examples:
- aggregate pipeline examples ($match, $group, $project, $lookup, $unwind)
- find() with complex filters
- updateMany() / deleteMany() examples
- Create indexes (createIndex)
- Explain query (explain())
- Cursor methods (limit, sort, skip)
Note: Use JSON format for MQL queries.`;
      } else {
        engineContext = `The user is connected to a **${dbType}** database. Provide relevant query examples for this engine.`;
      }

      return `Generate practical database query suggestions for the topic: "${topic}".\n\n${engineContext}\n\nProvide 8-12 ready-to-use queries organized by category. Each query should have a brief comment explaining what it does. Format them as code blocks (SQL or JSON for MQL).`;
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
      return { command: withVietnameseResponse(cmd), args };
    }
  }

  return null;
}

/**
 * Filter commands that match a partial input (for autocomplete).
 * E.g., "/ex" matches "/explain", "/op" matches "/optimize".
 */
export function filterCommands(partialInput: string): SlashCommand[] {
  return filterCommandsByInput(partialInput).map(withVietnameseResponse);
}

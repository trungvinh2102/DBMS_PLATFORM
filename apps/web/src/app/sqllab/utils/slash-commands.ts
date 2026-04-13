/**
 * @file slash-commands.ts
 * @description Slash command registry and parser for the AI Assistant chat input.
 * Supports commands like /explain, /optimize, /fix, /describe, /chart.
 * Each command defines its action, parameter requirements, and description.
 */

import { FileSearch, Wand2, Wrench, Table2, Zap, type LucideIcon } from "lucide-react";

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
  {
    command: "/lineage",
    description: "Analyze query data lineage and dependencies",
    icon: Table2,
    requiresEditorSQL: true,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      return `Analyze the data lineage of this SQL query. Identify which source tables and columns are used, and how they map to the final result set columns. List all dependencies and transformations:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``;
    },
  },
  {
    command: "/quality",
    description: "Audit SQL for quality, naming, and style",
    icon: Wand2,
    requiresEditorSQL: true,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      if (!ctx.editorSQL.trim()) return null;
      return `Audit this SQL query for code quality and best practices. Check for: 1. Naming conventions (aliases). 2. Formatting/Readability. 3. Redundant logic. 4. Dialect-specific optimizations. Provide a score from 1-10 and specific refactor recommendations:\n\n\`\`\`sql\n${ctx.editorSQL}\n\`\`\``;
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
- JSON functions (json_extract, json_each, json_group_array — SQLite 3.38+)
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
DuckDB is an analytical database — emphasize its OLAP strengths.`;
      } else if (dbType.includes("clickhouse")) {
        engineContext = `The user is connected to a **ClickHouse** database. Provide ClickHouse-specific query examples including:
- Specific engines: MergeTree, SummingMergeTree, ReplacingMergeTree
- Columnar-specific functions: any(), groupUniqArray(), argMax(), argMin()
- Array functions: arrayMap, arrayFilter, arrayJoin
- Dictionary lookups
- Sample and Final clauses
- EXPLAIN plan analysis
- System tables: system.parts, system.processes, system.mutations
ClickHouse is a column-oriented OLAP database — focus on high-speed aggregation and large-scale data analysis.`;
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
  {
    command: "/schema",
    description: "Explore database structure and relationships",
    icon: Table2,
    requiresEditorSQL: false,
    acceptsArgs: false,
    buildPrompt: (ctx) => {
      const dbType = ctx.databaseType || "unknown";
      let schemaQuery = "";
      
      if (dbType.includes("sqlite")) {
        schemaQuery = `For this **SQLite** database, generate the following introspection queries:
1. List all tables and views: \`SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name;\`
2. List all triggers: \`SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger';\`
3. List all indexes: \`SELECT name, tbl_name FROM sqlite_master WHERE type='index';\`
4. For each table, show PRAGMA table_info and PRAGMA foreign_key_list
5. Database file info: PRAGMA database_list, PRAGMA page_count, PRAGMA page_size
Explain each query's output and what insights it provides.`;
      } else if (dbType.includes("duckdb")) {
        schemaQuery = `For this **DuckDB** database, generate the following introspection queries:
1. List all tables: \`SELECT * FROM information_schema.tables WHERE table_schema='main';\`
2. Show columns: \`SELECT * FROM information_schema.columns WHERE table_schema='main';\`
3. Describe a table: \`DESCRIBE table_name;\`
4. Use SUMMARIZE for column profiling: \`SUMMARIZE table_name;\`
5. System info: \`SELECT * FROM duckdb_settings();\` and \`SELECT * FROM duckdb_extensions();\`
Explain each query's output and what insights it provides.`;
      } else if (dbType.includes("clickhouse")) {
        schemaQuery = `For this **ClickHouse** database, generate the following introspection queries:
1. List all tables and engines: \`SELECT name, engine, partition_key FROM system.tables WHERE database = currentDatabase();\`
2. Show columns and types: \`SELECT name, type, default_expression FROM system.columns WHERE table = 'your_table';\`
3. Check table sizes: \`SELECT table, formatReadableSize(sum(data_compressed_bytes)) AS size FROM system.parts WHERE active GROUP BY table;\`
4. List dictionaries: \`SELECT * FROM system.dictionaries;\`
5. Show parts and partitions: \`SELECT partition, name, active FROM system.parts WHERE table = 'your_table' ORDER BY partition;\`
Explain each query's output and what insights it provides.`;
      } else if (dbType.includes("mongodb")) {
        schemaQuery = `For this **MongoDB** database, explain how to explore the schema using MQL:
1. List collections: \`db.getCollectionNames()\`
2. Stats for a collection: \`db.collection.stats()\`
3. Sample a document to see structure: \`db.collection.findOne()\`
4. List indexes: \`db.collection.getIndexes()\`
5. Analyze schema (using aggregation): \`db.collection.aggregate([ { $sample: { size: 100 } }, { $project: { keys: { $objectToArray: "$$ROOT" } } }, { $unwind: "$keys" }, { $group: { _id: "$keys.k", types: { $addToSet: { $type: "$keys.v" } } } } ])\`
Explain how MongoDB's schemaless nature works and how these commands help understand the data.`;
      } else {
        schemaQuery = `Generate comprehensive schema exploration queries for this **${dbType}** database.`;
      }

      return schemaQuery;
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

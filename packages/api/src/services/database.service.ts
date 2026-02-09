import type { ClientConfig } from "pg";
import { Client } from "pg";
import prisma from "@dbms-platform/db";
import { encrypt, decrypt } from "../utils/crypto";
import type { DatabaseConfig } from "../types";

export class DatabaseService {
  private maskConfig(config: DatabaseConfig | null) {
    if (!config) return config;
    const masked = { ...config };
    if (masked.password) {
      masked.password = "********";
    }
    if (masked.uri && typeof masked.uri === "string") {
      // Improved regex to only mask the password part between : and @
      // e.g., postgresql://user:pass@host -> postgresql://user:****@host
      masked.uri = masked.uri.replace(/(:\/\/.*:)(.*)(@.*)/, "$1****$3");
    }
    return masked as DatabaseConfig;
  }

  private decryptUri(uri: string): string {
    try {
      return decrypt(uri);
    } catch {
      // Not fully encrypted
    }
    try {
      const u = new URL(uri);
      if (u.password) {
        try {
          u.password = decrypt(u.password);
          return u.toString();
        } catch {
          // Password not encrypted - return as-is
        }
      }
    } catch {
      // Not a valid URL
    }
    return uri;
  }

  private encryptUri(uri: string): string {
    try {
      const u = new URL(uri);
      if (u.password && u.password !== "********") {
        u.password = encrypt(u.password);
        return u.toString();
      }
    } catch {
      return encrypt(uri);
    }
    return uri;
  }

  /**
   * List all available database connections.
   */
  async listDatabases() {
    const databases = await prisma.db.findMany({
      orderBy: { databaseName: "asc" },
    });

    // Mask sensitive config before sending to frontend
    return databases.map((db) => ({
      ...db,
      config: this.maskConfig(db.config as unknown as DatabaseConfig),
    }));
  }

  /**
   * Helper to get database connection configuration
   */
  private async getDbConfig(databaseId: string) {
    const db = await prisma.db.findUnique({
      where: { id: databaseId },
    });

    if (!db) {
      throw new Error(`Database connection with ID ${databaseId} not found`);
    }

    const config = db.config as unknown as DatabaseConfig;

    // Decrypt password if it exists
    if (config.password) {
      try {
        const decrypted = decrypt(config.password);
        config.password = decrypted;
      } catch (e: any) {
        // Fallback for non-encrypted values
      }
    }

    // Decrypt URI if it exists
    if (config.uri) {
      config.uri = this.decryptUri(config.uri);
    }

    return {
      type: db.type,
      config: config,
    };
  }

  /**
   * Execute a query on a specific database with automatic connection management
   */
  private async runDynamicQuery<T>(
    databaseId: string,
    run: (client: Client) => Promise<T>,
  ): Promise<T> {
    const { type, config } = await this.getDbConfig(databaseId);

    if (type !== "postgres") {
      throw new Error(
        `Execution for database type "${type}" is not implemented yet.`,
      );
    }

    // Support both URI and individual params
    let clientConfig: ClientConfig;

    if (config.uri) {
      // Standardize localhost to 127.0.0.1 to avoid resolution issues in some environments
      const uri = config.uri.replace("localhost", "127.0.0.1");
      // console.log(`Using URI-based connection for DB ${databaseId}`);
      clientConfig = { connectionString: uri };
    } else {
      // console.log(
      //   `Using params-based connection for DB ${databaseId} (user: ${config.user}, host: ${config.host})`,
      // );
      clientConfig = {
        host:
          config.host === "localhost" ? "127.0.0.1" : (config.host as string),
        port: Number(config.port),
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
      };
    }

    const client = new Client(clientConfig);
    try {
      if (clientConfig.connectionString) {
        // console.log(
        //   `Connecting to: ${clientConfig.connectionString.replace(/:.+@/, ":****@")}`,
        // );
      } else {
        // console.log(
        //   `Connecting to: ${clientConfig.host}:${clientConfig.port}/${clientConfig.database} as ${clientConfig.user}`,
        // );
      }
      await client.connect();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to connect to database: ${message}`);
    }

    try {
      return await run(client);
    } finally {
      await client
        .end()
        .catch((err) => console.error("Error closing client:", err));
    }
  }

  async getSchemas(databaseId: string) {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ schema_name: string }>(
        `SELECT schema_name FROM information_schema.schemata 
         WHERE schema_name NOT IN ('pg_catalog', 'pg_toast')
         AND schema_name NOT LIKE 'pg_temp_%'
         AND schema_name NOT LIKE 'pg_toast_temp_%'
         ORDER BY schema_name`,
      );
      return res.rows.map((s) => s.schema_name);
    });
  }

  /**
   * Fetches tables from a schema in a data source.
   */
  async getTables(databaseId: string, schema: string = "public") {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = $1 AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
        [schema],
      );
      return res.rows.map((t) => t.table_name);
    });
  }

  /**
   * Fetches views from a schema in a data source.
   */
  async getViews(databaseId: string, schema: string = "public") {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.views 
         WHERE table_schema = $1
         ORDER BY table_name`,
        [schema],
      );
      return res.rows.map((t) => t.table_name);
    });
  }

  /**
   * Fetches functions from a schema.
   */
  async getFunctions(databaseId: string, schema: string = "public") {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ routine_name: string }>(
        `SELECT routine_name FROM information_schema.routines 
         WHERE routine_schema = $1 AND routine_type = 'FUNCTION'
         ORDER BY routine_name`,
        [schema],
      );
      return res.rows.map((r) => r.routine_name);
    });
  }

  /**
   * Fetches procedures from a schema.
   */
  async getProcedures(databaseId: string, schema: string = "public") {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ routine_name: string }>(
        `SELECT routine_name FROM information_schema.routines 
         WHERE routine_schema = $1 AND routine_type = 'PROCEDURE'
         ORDER BY routine_name`,
        [schema],
      );
      return res.rows.map((r) => r.routine_name);
    });
  }

  /**
   * Fetches triggers from a schema.
   */
  async getTriggers(databaseId: string, schema: string = "public") {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ trigger_name: string }>(
        `SELECT DISTINCT trigger_name FROM information_schema.triggers 
         WHERE event_object_schema = $1
         ORDER BY trigger_name`,
        [schema],
      );
      return res.rows.map((t) => t.trigger_name);
    });
  }

  /**
   * Fetches events (Postgres placeholder).
   */
  async getEvents(databaseId: string, schema: string = "public") {
    // Postgres doesn't have standard "events" like MySQL.
    // Returning empty list for compatibility.
    // Unused vars to suppress linter
    void databaseId;
    void schema;
    return [];
  }

  /**
   * Fetches columns for a table.
   */
  async getColumns(databaseId: string, schema: string, table: string) {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<any>(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, table],
      );
      return res.rows.map((c: any) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      }));
    });
  }

  /**
   * Fetches all columns for all tables in a schema.
   */
  async getAllColumns(databaseId: string, schema: string = "public") {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<any>(
        `SELECT table_name, column_name, data_type 
         FROM information_schema.columns 
         WHERE table_schema = $1
         ORDER BY table_name, ordinal_position`,
        [schema],
      );
      return res.rows.map((c) => ({
        table: c.table_name,
        name: c.column_name,
        type: c.data_type,
      }));
    });
  }

  /**
   * Fetches indexes for a table.
   */
  async getIndexes(databaseId: string, schema: string, table: string) {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2`,
        [schema, table],
      );
      return res.rows;
    });
  }

  /**
   * Fetches foreign keys (relations) for a table.
   */
  async getForeignKeys(databaseId: string, schema: string, table: string) {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<any>(
        `SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2`,
        [schema, table],
      );
      return res.rows.map((r) => ({
        constraint: r.constraint_name,
        column: r.column_name,
        foreignSchema: r.foreign_table_schema,
        foreignTable: r.foreign_table_name,
        foreignColumn: r.foreign_column_name,
      }));
    });
  }

  /**
   * Fetches table stats/info.
   */
  async getTableInfo(databaseId: string, schema: string, table: string) {
    return await this.runDynamicQuery(databaseId, async (client) => {
      const res = await client.query<any>(
        `SELECT
          pg_size_pretty(pg_total_relation_size(quote_ident($1) || '.' || quote_ident($2))) as total_size,
          pg_size_pretty(pg_relation_size(quote_ident($1) || '.' || quote_ident($2))) as data_size,
          pg_size_pretty(pg_total_relation_size(quote_ident($1) || '.' || quote_ident($2)) - pg_relation_size(quote_ident($1) || '.' || quote_ident($2))) as index_size,
          (SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname = $1 AND relname = $2) as row_count
        `,
        [schema, table],
      );
      return res.rows[0];
    });
  }

  /**
   * Generates a basic CREATE TABLE script (DDL).
   */
  async getTableDDL(databaseId: string, schema: string, table: string) {
    // This is a simplified reconstruction.
    // Ideally, use pg_dump or a robust library.
    return await this.runDynamicQuery(databaseId, async (client) => {
      // Get columns
      const colsRes = await client.query<any>(
        `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, table],
      );

      // Get PK
      const pkRes = await client.query<any>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2`,
        [schema, table],
      );
      const pks = pkRes.rows.map((r) => r.column_name);

      let sql = `CREATE TABLE "${schema}"."${table}" (\n`;
      const lines: string[] = [];

      colsRes.rows.forEach((col) => {
        let line = `  "${col.column_name}" ${col.data_type.toUpperCase()}`;
        if (col.character_maximum_length) {
          line += `(${col.character_maximum_length})`;
        }
        if (col.is_nullable === "NO") {
          line += " NOT NULL";
        }
        if (col.column_default) {
          line += ` DEFAULT ${col.column_default}`;
        }
        lines.push(line);
      });

      if (pks.length > 0) {
        lines.push(
          `  PRIMARY KEY (${pks.map((k: string) => `"${k}"`).join(", ")})`,
        );
      }

      sql += lines.join(",\n");
      sql += "\n);";

      return sql;
    });
  }

  /**
   * Executes a raw SQL query.
   */
  async executeQuery(databaseId: string, sql: string) {
    const startTime = Date.now();
    let status = "SUCCESS";
    let errorMessage = null;
    let result: any[] = [];
    let columns: string[] = [];

    try {
      if (!databaseId) throw new Error("Database connection required");
      if (!sql || sql.trim() === "")
        throw new Error("SQL query cannot be empty");

      const response = await this.runDynamicQuery(
        databaseId,
        async (client) => {
          const res = await client.query(sql);
          return res;
        },
      );

      if (Array.isArray(response)) {
        // Multi-query result
        const lastResult = response[response.length - 1];
        result = lastResult.rows || [];
        columns = lastResult.fields?.map((f: any) => f.name) || [];
      } else {
        result = response.rows || [];
        columns = response.fields?.map((f: any) => f.name) || [];
      }
    } catch (e) {
      status = "FAILED";
      errorMessage =
        e instanceof Error
          ? e.message
          : String(e) || "An error occurred while executing the query.";
      result = [];
    }

    const executionTime = Date.now() - startTime;

    // Record history asynchronously
    if (databaseId && sql) {
      prisma.queryHistory
        .create({
          data: {
            sql,
            status,
            executionTime,
            errorMessage: errorMessage?.substring(0, 500),
            databaseId,
          },
        })
        .catch((err) => console.error("Failed to record query history:", err));
    }

    return {
      data: result,
      columns:
        columns.length > 0
          ? columns
          : result.length > 0
            ? Object.keys(result[0])
            : [],
      executionTime,
      error: errorMessage,
    };
  }

  /**
   * Fetches query history.
   */
  async getQueryHistory(databaseId?: string, limit: number = 50) {
    return prisma.queryHistory.findMany({
      where: databaseId ? { databaseId } : {},
      orderBy: { created_on: "desc" },
      take: limit,
      include: {
        database: {
          select: {
            databaseName: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new database connection.
   */
  async createDatabase(data: {
    databaseName: string;
    type: string;
    environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
    isReadOnly?: boolean;
    sslMode?: "DISABLE" | "REQUIRE" | "VERIFY_CA" | "VERIFY_FULL";
    sshConfig?: any;
    tags?: string[];
    config: any;
  }) {
    const config = { ...data.config };
    if (config.password) {
      config.password = encrypt(config.password);
    }
    if (config.uri) {
      config.uri = this.encryptUri(config.uri);
    }

    const result = await prisma.db.create({
      data: {
        databaseName: data.databaseName,
        type: data.type,
        environment: data.environment,
        isReadOnly: data.isReadOnly,
        sslMode: data.sslMode,
        sshConfig: data.sshConfig,
        tags: data.tags,
        config,
      },
    });

    return {
      ...result,
      config: this.maskConfig(result.config as unknown as DatabaseConfig),
    };
  }

  /**
   * Updates an existing database connection.
   */
  async updateDatabase(
    id: string,
    data: {
      databaseName?: string;
      type?: string;
      environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
      isReadOnly?: boolean;
      sslMode?: "DISABLE" | "REQUIRE" | "VERIFY_CA" | "VERIFY_FULL";
      sshConfig?: unknown;
      tags?: string[];
      config?: DatabaseConfig;
    },
  ) {
    const updateData: any = { ...data };

    if (updateData.config) {
      const config = { ...updateData.config };
      if (config.password && config.password !== "********") {
        config.password = encrypt(config.password);
      } else {
        // If password is masked, create specific logic or rely on frontend not sending '********'
        // For now, if it's masked, we might need to fetch the old password.
        // Simplified: Assume frontend sends full config or we handle it in router.
        // Better: Fetch existing config if password is '********'
        const existing = await prisma.db.findUnique({
          where: { id },
          select: { config: true },
        });
        const oldConfig = existing?.config as unknown as DatabaseConfig;
        if (config.password === "********" && oldConfig?.password) {
          config.password = oldConfig.password;
        }
      }

      if (config.uri) {
        if (config.uri.includes("****")) {
          // Trying to save a masked URI, recover original if possible or error?
          // Safer to just encrypt what is sent if it's not masked.
          // If masked, we need to handle it.
          const existing = await prisma.db.findUnique({
            where: { id },
            select: { config: true },
          });
          const oldConfig = existing?.config as unknown as DatabaseConfig;
          // Naive check. Real implementation needs robust separate password update.
          if (oldConfig?.uri) {
            config.uri = oldConfig.uri;
          }
        } else {
          config.uri = this.encryptUri(config.uri);
        }
      }

      updateData.config = config;
    }

    const result = await prisma.db.update({
      where: { id },
      data: updateData,
    });

    return {
      ...result,
      config: this.maskConfig(result.config as unknown as DatabaseConfig),
    };
  }

  /**
   * Deletes a database connection.
   */
  async deleteDatabase(id: string) {
    return prisma.db.delete({
      where: { id },
    });
  }

  /**
   * Saves a query.
   */
  async saveQuery(data: {
    name: string;
    description?: string;
    sql: string;
    databaseId: string;
    userId?: string;
  }) {
    return prisma.savedQuery.create({
      data: {
        name: data.name,
        description: data.description,
        sql: data.sql,
        databaseId: data.databaseId,
        userId: data.userId,
      },
    });
  }

  /**
   * Lists saved queries.
   */
  async listSavedQueries(databaseId?: string, userId?: string) {
    return prisma.savedQuery.findMany({
      where: {
        AND: [databaseId ? { databaseId } : {}, userId ? { userId } : {}],
      },
      orderBy: { changed_on: "desc" },
      include: {
        database: {
          select: { databaseName: true },
        },
      },
    });
  }

  /**
   * Tests a database connection.
   */
  async testConnection(data: { id?: string; type?: string; config?: any }) {
    try {
      let config = data.config;
      let type = data.type;

      // If ID is provided, fetch config from DB
      if (data.id) {
        const dbInfo = await this.getDbConfig(data.id);
        config = dbInfo.config;
        type = dbInfo.type;
      }

      if (!config) {
        throw new Error("Missing connection configuration");
      }

      if (type !== "postgres") {
        throw new Error(
          `Test connection for type "${type}" is not implemented yet.`,
        );
      }

      // Check for raw connection details or URI
      let clientConfig: any = {};

      if (config.uri) {
        // Standardize localhost
        const uri = config.uri.replace("localhost", "127.0.0.1");
        clientConfig = { connectionString: uri };
      } else {
        clientConfig = {
          host: config.host === "localhost" ? "127.0.0.1" : config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          ssl: config.ssl ? { rejectUnauthorized: false } : false,
        };
      }

      // Set a short timeout for tests
      clientConfig.connectionTimeoutMillis = 5000;

      const client = new Client(clientConfig);
      await client.connect();

      // Simple query to verify connection
      await client.query("SELECT 1");

      await client.end();

      return { success: true, message: "Connection successful" };
    } catch (e: any) {
      return { success: false, message: e.message || "Connection failed" };
    }
  }
}

export const databaseService = new DatabaseService();

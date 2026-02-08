import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { databaseService } from "../services/database.service";

export const databaseRouter = router({
  listDatabases: publicProcedure.query(async () => {
    return databaseService.listDatabases();
  }),

  getSchemas: publicProcedure
    .input(z.object({ databaseId: z.string() }))
    .query(async ({ input }) => {
      return databaseService.getSchemas(input.databaseId);
    }),

  getTables: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getTables(input.databaseId, input.schema);
    }),

  getViews: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getViews(input.databaseId, input.schema);
    }),

  getFunctions: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getFunctions(input.databaseId, input.schema);
    }),

  getProcedures: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getProcedures(input.databaseId, input.schema);
    }),

  getTriggers: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getTriggers(input.databaseId, input.schema);
    }),

  getEvents: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getEvents(input.databaseId, input.schema);
    }),

  getColumns: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string(),
        table: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getColumns(
        input.databaseId,
        input.schema,
        input.table,
      );
    }),
  getAllColumns: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getAllColumns(input.databaseId, input.schema);
    }),

  execute: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        sql: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return databaseService.executeQuery(input.databaseId, input.sql);
    }),

  getQueryHistory: publicProcedure
    .input(
      z.object({
        databaseId: z.string().optional(),
        limit: z.number().optional().default(50),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.getQueryHistory(input.databaseId, input.limit);
    }),

  createDatabase: publicProcedure
    .input(
      z.object({
        databaseName: z.string(),
        type: z.string(),
        environment: z
          .enum(["PRODUCTION", "STAGING", "DEVELOPMENT"])
          .optional(),
        isReadOnly: z.boolean().optional(),
        sslMode: z
          .enum(["DISABLE", "REQUIRE", "VERIFY_CA", "VERIFY_FULL"])
          .optional(),
        sshConfig: z.any().optional(),
        tags: z.array(z.string()).optional(),
        config: z.any(),
      }),
    )
    .mutation(async ({ input }) => {
      // @ts-ignore
      return databaseService.createDatabase(input);
    }),

  updateDatabase: publicProcedure
    .input(
      z.object({
        id: z.string(),
        databaseName: z.string().optional(),
        type: z.string().optional(),
        environment: z
          .enum(["PRODUCTION", "STAGING", "DEVELOPMENT"])
          .optional(),
        isReadOnly: z.boolean().optional(),
        sslMode: z
          .enum(["DISABLE", "REQUIRE", "VERIFY_CA", "VERIFY_FULL"])
          .optional(),
        sshConfig: z.any().optional(),
        tags: z.array(z.string()).optional(),
        config: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      // @ts-ignore
      return databaseService.updateDatabase(id, data);
    }),

  deleteDatabase: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return databaseService.deleteDatabase(input.id);
    }),
  saveQuery: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        sql: z.string(),
        databaseId: z.string(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return databaseService.saveQuery(input);
    }),
  listSavedQueries: publicProcedure
    .input(
      z.object({
        databaseId: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return databaseService.listSavedQueries(input.databaseId, input.userId);
    }),

  testConnection: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
        type: z.string().optional(),
        config: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return databaseService.testConnection(input);
    }),
});

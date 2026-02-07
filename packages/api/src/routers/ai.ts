/**
 * @file ai.ts
 * @description tRPC router for AI-related operations.
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { aiService } from "../services/ai.service";

export const aiRouter = router({
  generateSQL: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return aiService.generateSQL(input);
    }),

  explainSQL: publicProcedure
    .input(z.object({ sql: z.string() }))
    .mutation(async ({ input }) => {
      return aiService.explainSQL(input.sql);
    }),

  optimizeSQL: publicProcedure
    .input(
      z.object({
        sql: z.string(),
        databaseId: z.string(),
        schema: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return aiService.optimizeSQL(input);
    }),
});

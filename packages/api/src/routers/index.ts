import { publicProcedure, router } from "../trpc";
import { databaseRouter } from "./database";

import { authRouter } from "./auth";
import { userRouter } from "./user";
import { aiRouter } from "./ai";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  database: databaseRouter,
  auth: authRouter,
  user: userRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;

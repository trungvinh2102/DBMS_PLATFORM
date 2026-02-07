import * as dotenv from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

dotenv.config({
  path: "../../.env",
});

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

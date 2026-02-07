import { env } from "@dbms-platform/env/server";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@prisma/client";

const connectionString = env.DATABASE_URL.replace("localhost", "127.0.0.1");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export * from "@prisma/client";
export default prisma;

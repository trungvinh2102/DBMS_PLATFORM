import { type NextRequest } from "next/server";
import prisma from "@dbms-platform/db";
import jwt from "jsonwebtoken";
import { env } from "@dbms-platform/env/server";

interface ContextUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
}

export interface Context {
  session: {
    user: ContextUser | null;
  } | null;
  prisma: typeof prisma;
}

export async function createContext(req: NextRequest): Promise<Context> {
  // Check Authorization header first
  const authHeader = req.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  // Fallback to cookie if no header
  if (!token) {
    const cookieToken = req.cookies.get("auth-token")?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  let user: ContextUser | null = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role.name,
          permissions: dbUser.role.permissions.map(
            (p) => `${p.action}:${p.resource}`,
          ),
        };
      }
    } catch (err) {
      // Token invalid or expired
    }
  }

  return {
    session: { user },
    prisma,
  };
}

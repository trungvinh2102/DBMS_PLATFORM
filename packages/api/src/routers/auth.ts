import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@dbms-platform/env/server";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        include: { role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role.name },
        env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role.name,
        },
      };
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingEmail = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already exists",
        });
      }

      const existingUsername = await ctx.prisma.user.findUnique({
        where: { username: input.username },
      });

      if (existingUsername) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }

      // Assign 'Default' role
      const defaultRole = await ctx.prisma.role.findFirst({
        where: { name: "Default" },
      });

      if (!defaultRole) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Default role not found",
        });
      }

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          password: hashedPassword,
          name: input.name,
          roleId: defaultRole.id,
        },
        include: { role: true },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role.name },
        env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role.name,
        },
      };
    }),
});

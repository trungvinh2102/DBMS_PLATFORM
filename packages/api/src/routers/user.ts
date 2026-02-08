import { router, adminProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import type { UserSettings } from "../types";
// Updated: 2026-02-07 23:35
import { TRPCError } from "@trpc/server";

const userSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["en", "vi"]).optional(),
  editorFontSize: z.number().optional(),
  editorFontFamily: z.string().optional(),
  editorTabSize: z.number().optional(),
  editorMinimap: z.boolean().optional(),
  editorWordWrap: z.enum(["on", "off", "wordWrapColumn", "bounded"]).optional(),
  editorLineNumbers: z.enum(["on", "off", "relative", "interval"]).optional(),
  editorFormatOnPaste: z.boolean().optional(),
  editorFormatOnSave: z.boolean().optional(),
  defaultQueryLimit: z.number().optional(),
  showNullAs: z.string().optional(),
  dateTimeFormat: z.string().optional(),
  csvDelimiter: z.enum([",", ";"]).optional(),
});

export const userRouter = router({
  // Only admins can view all users
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: {
          select: {
            name: true,
            description: true,
          },
        },
        createdAt: true,
      },
    });
  }),

  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.session.user;
  }),

  // Assign role (Admin only)
  updateRole: adminProcedure
    .input(z.object({ userId: z.string(), roleName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.prisma.role.findUnique({
        where: { name: input.roleName },
      });

      if (!role) {
        throw new Error("Role not found");
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { roleId: role.id },
      });
    }),

  // Get user settings from DB
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user!.id;
    try {
      // Try standard way first
      if ((ctx.prisma as any).userSetting) {
        const userSetting = await (ctx.prisma as any).userSetting.findUnique({
          where: { userId },
        });
        return (userSetting?.settings as UserSettings) || null;
      }

      // Fallback to raw query if model is missing at runtime
      const result: any[] = await ctx.prisma
        .$queryRaw`SELECT settings FROM user_settings WHERE "userId" = ${userId} LIMIT 1`;
      return (result[0]?.settings as UserSettings) || null;
    } catch (e) {
      console.error("Error in getSettings:", e);
      return null;
    }
  }),

  // Save/Update user settings in DB
  updateSettings: protectedProcedure
    .input(userSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user!.id;
      const prisma = ctx.prisma as any;

      try {
        // Try standard way if property exists
        if (prisma.userSetting) {
          return await prisma.userSetting.upsert({
            where: { userId },
            update: { settings: input },
            create: { userId, settings: input as any },
          });
        }

        // Workaround: Use raw SQL if Prisma model is not yet loaded at runtime
        console.warn(
          "Prisma model 'userSetting' is missing at runtime. Using raw SQL fallback.",
        );

        // Postgres UPSERT syntax
        await prisma.$executeRaw`
          INSERT INTO user_settings (id, "userId", settings, "createdAt", "updatedAt")
          VALUES (${globalThis.crypto.randomUUID()}, ${userId}, ${JSON.stringify(input)}::jsonb, NOW(), NOW())
          ON CONFLICT ("userId") 
          DO UPDATE SET settings = ${JSON.stringify(input)}::jsonb, "updatedAt" = NOW()
        `;

        return { success: true };
      } catch (err: any) {
        console.error(
          "Failed to update settings. User ID:",
          userId,
          "Error:",
          err,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save settings: ${err.message}`,
          cause: err,
        });
      }
    }),
});

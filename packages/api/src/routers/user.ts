import { router, adminProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";

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
});

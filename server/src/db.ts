import { PrismaClient } from "@prisma/client";

// Create Prisma client instance
export const prisma = new PrismaClient();

// Middleware to log queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    console.log(
      `Query ${params.model}.${params.action} took ${after - before}ms`
    );
    return result;
  });
}

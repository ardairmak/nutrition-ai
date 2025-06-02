import { prisma } from "../db";
import { logger } from "./logger";

// Pagination helper
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: any;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginate<T>(
  model: any,
  options: PaginationOptions & { where?: any; include?: any }
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10)); // Max 100 items per page
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where: options.where,
      include: options.include,
      orderBy: options.orderBy,
      skip,
      take: limit,
    }),
    model.count({ where: options.where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Batch user queries to avoid N+1 problems
export async function getUsersWithDetails(userIds: string[]) {
  if (userIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      createdAt: true,
      // Exclude sensitive data
    },
  });
}

// Optimized meal queries with proper indexing hints
export async function getMealsOptimized(userId: string, days: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return prisma.mealEntry.findMany({
    where: {
      userId,
      createdAt: {
        gte: cutoffDate,
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      foodItems: {
        select: {
          id: true,
          foodName: true,
          calories: true,
          carbs: true,
          protein: true,
          fat: true,
          portionSize: true,
          portionUnit: true,
        },
      },
    },
  });
}

// Cache frequently accessed user data
const userCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedUser(userId: string) {
  const cached = userCache.get(userId);

  if (cached && cached.expiry > Date.now()) {
    logger.debug(`Cache hit for user ${userId}`);
    return cached.data;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      weight: true,
      height: true,
      fitnessGoals: true,
      activityLevel: true,
      profileSetupComplete: true,
      profilePicture: true,
    },
  });

  if (user) {
    userCache.set(userId, {
      data: user,
      expiry: Date.now() + CACHE_TTL,
    });
    logger.debug(`Cached user ${userId}`);
  }

  return user;
}

// Clear cache when user data changes
export function invalidateUserCache(userId: string) {
  userCache.delete(userId);
  logger.debug(`Invalidated cache for user ${userId}`);
}

// Batch friend operations
export async function getFriendsOptimized(userId: string) {
  const friendships = await prisma.userFriend.findMany({
    where: {
      OR: [
        { userId, status: "ACCEPTED" },
        { friendId: userId, status: "ACCEPTED" },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
        },
      },
      friend: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
        },
      },
    },
  });

  // Return the friend data (not the current user)
  return friendships.map((friendship) =>
    friendship.userId === userId ? friendship.friend : friendship.user
  );
}

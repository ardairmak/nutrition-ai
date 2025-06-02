import { PrismaClient } from "@prisma/client";
import { differenceInDays, isSameDay, startOfDay, subDays } from "date-fns";

const prisma = new PrismaClient();

/**
 * Record a user login and update their streak
 * @param userId The ID of the user who logged in
 */
export async function recordUserLogin(
  userId: string
): Promise<{ streak: number }> {
  const today = new Date();
  const todayStart = startOfDay(today);
  const yesterday = subDays(today, 1);

  // Get user with their latest login history
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      loginHistory: {
        orderBy: { loginDate: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user already logged in today
  const hasLoggedInToday = user.loginHistory.some((login) =>
    isSameDay(login.loginDate, today)
  );

  if (!hasLoggedInToday) {
    // Record today's login using start of day to avoid unique constraint issues
    await prisma.userLoginHistory.create({
      data: {
        userId,
        loginDate: todayStart, // Use start of day instead of current time
      },
    });

    // Update streak
    const lastLoginDate = user.lastStreakUpdate;
    let newStreak = user.loginStreak;

    // If last login was yesterday, increment streak
    if (lastLoginDate && differenceInDays(today, lastLoginDate) === 1) {
      newStreak += 1;
    }
    // If last login was more than a day ago, reset streak to 1
    else if (!lastLoginDate || differenceInDays(today, lastLoginDate) > 1) {
      newStreak = 1;
    }
    // If last login was today (multiple logins in same day), streak remains the same

    // Update user streak
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginStreak: newStreak,
        lastStreakUpdate: todayStart, // Also use start of day for consistency
        lastLogin: today, // Keep actual login time for lastLogin
      },
    });

    return { streak: newStreak };
  }

  return { streak: user.loginStreak };
}

/**
 * Get the current streak for a user
 * @param userId The user ID
 */
export async function getUserStreak(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      loginStreak: true,
      lastStreakUpdate: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If last streak update was more than a day ago, streak is broken
  const today = new Date();
  if (
    user.lastStreakUpdate &&
    differenceInDays(today, user.lastStreakUpdate) > 1
  ) {
    // Reset the streak to 0 since it's broken
    await prisma.user.update({
      where: { id: userId },
      data: { loginStreak: 0 },
    });
    return 0;
  }

  return user.loginStreak;
}

/**
 * Get the nutrition data for a user for a specific date
 * @param userId The user ID
 * @param date The date to fetch nutrition data for
 */
export async function getUserNutritionData(
  userId: string,
  date: Date = new Date()
) {
  const startOfToday = startOfDay(date);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  // Get user's goals
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyCalorieGoal: true,
      proteinGoal: true,
      carbsGoal: true,
      fatGoal: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get all meal entries for the day
  const mealEntries = await prisma.mealEntry.findMany({
    where: {
      userId,
      consumedAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
    select: {
      totalCalories: true,
      totalProtein: true,
      totalCarbs: true,
      totalFat: true,
    },
  });

  // Calculate total consumed nutrients
  const consumed = mealEntries.reduce(
    (acc, meal) => {
      acc.calories += meal.totalCalories;
      acc.protein += meal.totalProtein;
      acc.carbs += meal.totalCarbs;
      acc.fat += meal.totalFat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Return the nutrition data with goals and consumed values
  return {
    calories: {
      goal: user.dailyCalorieGoal || 2000, // Default value if not set
      consumed: consumed.calories,
    },
    protein: {
      goal: user.proteinGoal || 150,
      consumed: consumed.protein,
      unit: "g",
    },
    carbs: {
      goal: user.carbsGoal || 200,
      consumed: consumed.carbs,
      unit: "g",
    },
    fat: {
      goal: user.fatGoal || 65,
      consumed: consumed.fat,
      unit: "g",
    },
  };
}

/**
 * Get recent food entries for a user
 * @param userId The user ID
 * @param limit The maximum number of entries to return
 */
export async function getRecentFoodEntries(userId: string, limit: number = 5) {
  const recentEntries = await prisma.mealEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      foodItems: true,
    },
  });

  return recentEntries.map((entry) => {
    return {
      id: entry.id,
      name: entry.mealName,
      calories: entry.totalCalories,
      protein: entry.totalProtein,
      carbs: entry.totalCarbs,
      fat: entry.totalFat,
      consumedAt: entry.consumedAt,
      imageUri: entry.imageUrl, // Return the actual S3 image URL
      progress: Math.min(Math.round((entry.totalCalories / 2000) * 100), 100),
    };
  });
}

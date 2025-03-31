import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspectTables() {
  try {
    console.log("Database inspection:");

    // Count records in each table
    const userCount = await prisma.user.count();
    const mealEntryCount = await prisma.mealEntry.count();
    const foodItemCount = await prisma.foodItem.count();
    const weightHistoryCount = await prisma.weightHistory.count();
    const userFriendCount = await prisma.userFriend.count();
    const achievementCount = await prisma.achievement.count();
    const userAchievementCount = await prisma.userAchievement.count();
    const mealRecommendationCount = await prisma.mealRecommendation.count();

    console.log({
      userCount,
      mealEntryCount,
      foodItemCount,
      weightHistoryCount,
      userFriendCount,
      achievementCount,
      userAchievementCount,
      mealRecommendationCount,
    });

    // Get a sample of users
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    console.log("Sample users:", users);
  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
inspectTables()
  .then(() => console.log("Done"))
  .catch(console.error);

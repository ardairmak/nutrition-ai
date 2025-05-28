-- DropForeignKey
ALTER TABLE "FoodItem" DROP CONSTRAINT "FoodItem_mealEntryId_fkey";

-- DropForeignKey
ALTER TABLE "MealEntry" DROP CONSTRAINT "MealEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "MealRecommendation" DROP CONSTRAINT "MealRecommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserFriend" DROP CONSTRAINT "UserFriend_friendId_fkey";

-- DropForeignKey
ALTER TABLE "UserFriend" DROP CONSTRAINT "UserFriend_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserLoginHistory" DROP CONSTRAINT "UserLoginHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "WeightHistory" DROP CONSTRAINT "WeightHistory_userId_fkey";

-- DropIndex
DROP INDEX "UserLoginHistory_userId_idx";

-- AddForeignKey
ALTER TABLE "WeightHistory" ADD CONSTRAINT "WeightHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "MealEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriend" ADD CONSTRAINT "UserFriend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriend" ADD CONSTRAINT "UserFriend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealRecommendation" ADD CONSTRAINT "MealRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoginHistory" ADD CONSTRAINT "UserLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

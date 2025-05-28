-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastStreakUpdate" TIMESTAMP(3),
ADD COLUMN     "loginStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserLoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLoginHistory_userId_idx" ON "UserLoginHistory"("userId");

-- CreateIndex
CREATE INDEX "UserLoginHistory_loginDate_idx" ON "UserLoginHistory"("loginDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserLoginHistory_userId_loginDate_key" ON "UserLoginHistory"("userId", "loginDate");

-- AddForeignKey
ALTER TABLE "UserLoginHistory" ADD CONSTRAINT "UserLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

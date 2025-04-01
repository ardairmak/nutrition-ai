-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileSetupComplete" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

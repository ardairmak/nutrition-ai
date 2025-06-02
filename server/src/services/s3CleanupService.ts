import { prisma } from "../db";
import { deleteFromS3 } from "../config/aws";
import { logger } from "../utils/logger";

export class S3CleanupService {
  /**
   * Clean up meal images older than 7 days
   */
  static async cleanupOldMealImages(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      logger.info(
        `Starting cleanup of meal images older than ${sevenDaysAgo.toISOString()}`
      );

      // Find meal entries older than 7 days that have images
      const oldMealEntries = await prisma.mealEntry.findMany({
        where: {
          consumedAt: {
            lt: sevenDaysAgo,
          },
          imageUrl: {
            not: null,
          },
        },
        select: {
          id: true,
          imageUrl: true,
          consumedAt: true,
        },
      });

      logger.info(
        `Found ${oldMealEntries.length} meal entries with images to clean up`
      );

      let deletedCount = 0;
      let errorCount = 0;

      for (const mealEntry of oldMealEntries) {
        if (!mealEntry.imageUrl) continue;

        try {
          // Extract the S3 key from the URL
          const s3Key = this.extractS3KeyFromUrl(mealEntry.imageUrl);

          if (s3Key) {
            // Delete from S3
            await deleteFromS3(s3Key);

            // Update the database to remove the imageUrl
            await prisma.mealEntry.update({
              where: { id: mealEntry.id },
              data: { imageUrl: null },
            });

            deletedCount++;
            logger.info(
              `Deleted image for meal entry ${mealEntry.id}: ${s3Key}`
            );
          } else {
            logger.warn(
              `Could not extract S3 key from URL: ${mealEntry.imageUrl}`
            );
          }
        } catch (error) {
          errorCount++;
          logger.error(
            `Error deleting image for meal entry ${mealEntry.id}:`,
            error
          );
        }
      }

      logger.info(
        `Cleanup completed. Deleted: ${deletedCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      logger.error("Error during S3 cleanup:", error);
      throw error;
    }
  }

  /**
   * Extract S3 key from a full S3 URL
   */
  private static extractS3KeyFromUrl(url: string): string | null {
    try {
      // Handle different S3 URL formats
      // Format 1: https://bucket-name.s3.region.amazonaws.com/key
      // Format 2: https://s3.region.amazonaws.com/bucket-name/key

      const urlObj = new URL(url);

      if (urlObj.hostname.includes(".s3.")) {
        // Format 1: bucket-name.s3.region.amazonaws.com
        return urlObj.pathname.substring(1); // Remove leading slash
      } else if (urlObj.hostname.startsWith("s3.")) {
        // Format 2: s3.region.amazonaws.com/bucket-name/key
        const pathParts = urlObj.pathname.split("/");
        if (pathParts.length >= 3) {
          // Remove empty string, bucket name, and return the rest as key
          return pathParts.slice(2).join("/");
        }
      }

      return null;
    } catch (error) {
      logger.error("Error extracting S3 key from URL:", error);
      return null;
    }
  }

  /**
   * Schedule automatic cleanup to run daily
   */
  static scheduleCleanup(): void {
    // Run cleanup every 24 hours
    const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    setInterval(async () => {
      try {
        logger.info("Running scheduled S3 cleanup...");
        await this.cleanupOldMealImages();
      } catch (error) {
        logger.error("Scheduled S3 cleanup failed:", error);
      }
    }, CLEANUP_INTERVAL);

    logger.info("S3 cleanup scheduler started - will run every 24 hours");
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalMealImages: number;
    imagesLast7Days: number;
    oldImagesCount: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalMealImages, imagesLast7Days] = await Promise.all([
      prisma.mealEntry.count({
        where: {
          imageUrl: { not: null },
        },
      }),
      prisma.mealEntry.count({
        where: {
          imageUrl: { not: null },
          consumedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      totalMealImages,
      imagesLast7Days,
      oldImagesCount: totalMealImages - imagesLast7Days,
    };
  }
}

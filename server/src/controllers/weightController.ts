import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parseISO } from "date-fns";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

// Custom type for the authenticated request user
type AuthUser = {
  id: string;
  email: string;
  // Add other user properties as needed
};

/**
 * Add a new weight entry for the user
 */
export const logWeight = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const { weight, recordedAt } = req.body;

    // Validate input
    if (typeof weight !== "number" || weight <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Valid weight value is required" });
    }

    // If recordedAt is provided, parse it, otherwise use current time
    const recordDate = recordedAt ? parseISO(recordedAt) : new Date();

    // Create the weight record
    const weightRecord = await prisma.weightHistory.create({
      data: {
        userId,
        weight,
        recordedAt: recordDate,
      },
    });

    // Also update the user's current weight for convenience
    await prisma.user.update({
      where: { id: userId },
      data: { weight },
    });

    logger.info(`Weight logged for user ${userId}: ${weight}kg`);

    return res.status(201).json({
      success: true,
      message: "Weight logged successfully",
      weightRecord,
    });
  } catch (error) {
    logger.error("Error logging weight:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to log weight" });
  }
};

/**
 * Get weight history for a user
 */
export const getWeightHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const { startDate, endDate, limit } = req.query;

    // Set up filter conditions
    const filterCondition: any = { userId };

    if (startDate) {
      filterCondition.recordedAt = {
        ...filterCondition.recordedAt,
        gte: parseISO(startDate as string),
      };
    }

    if (endDate) {
      filterCondition.recordedAt = {
        ...filterCondition.recordedAt,
        lte: parseISO(endDate as string),
      };
    }

    // Fetch weight history
    const weightHistory = await prisma.weightHistory.findMany({
      where: filterCondition,
      orderBy: {
        recordedAt: "asc",
      },
      take: limit ? parseInt(limit as string) : undefined,
    });

    return res.status(200).json({
      success: true,
      weightHistory,
    });
  } catch (error) {
    logger.error("Error fetching weight history:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch weight history" });
  }
};

/**
 * Delete a weight entry
 */
export const deleteWeightEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const { entryId } = req.params;

    // Check if the entry exists and belongs to the user
    const entry = await prisma.weightHistory.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });

    if (!entry) {
      return res
        .status(404)
        .json({ success: false, error: "Weight entry not found" });
    }

    // Delete the entry
    await prisma.weightHistory.delete({
      where: {
        id: entryId,
      },
    });

    logger.info(`Weight entry ${entryId} deleted by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Weight entry deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting weight entry:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete weight entry" });
  }
};

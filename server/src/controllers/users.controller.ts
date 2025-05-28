import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../db";

// Specific controller to force update goals for Google users
export async function forceUpdateGoals(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userId = req.user.id;
    const { fitnessGoals } = req.body;

    console.log(`Force update goals request for user ${userId}:`, fitnessGoals);

    if (
      !fitnessGoals ||
      !Array.isArray(fitnessGoals) ||
      fitnessGoals.length === 0
    ) {
      console.error("Invalid fitness goals data:", fitnessGoals);
      return res.status(400).json({
        success: false,
        error: "Invalid fitness goals data. Must be a non-empty array.",
      });
    }

    // First get the current user to verify
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      console.error(`User ${userId} not found in database`);
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    console.log(
      `User ${userId} found, current goals:`,
      currentUser.fitnessGoals
    );

    // Update the user's fitness goals directly in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fitnessGoals: fitnessGoals,
        updatedAt: new Date(),
      },
    });

    console.log(
      `User ${userId} goals updated successfully:`,
      updatedUser.fitnessGoals
    );

    // Verify update was successful
    if (
      !updatedUser.fitnessGoals ||
      !Array.isArray(updatedUser.fitnessGoals) ||
      updatedUser.fitnessGoals.length === 0
    ) {
      console.error(
        `Failed to update goals for user ${userId}, goals still empty:`,
        updatedUser.fitnessGoals
      );
      return res.status(500).json({
        success: false,
        error: "Failed to update fitness goals. Please try again.",
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Fitness goals updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fitnessGoals: updatedUser.fitnessGoals,
      },
    });
  } catch (error) {
    console.error("Error in forceUpdateGoals:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while updating fitness goals",
    });
  }
}

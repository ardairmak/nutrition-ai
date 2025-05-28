import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middleware/auth";
import { sendVerificationEmail } from "../utils/emailService";
import {
  recordUserLogin,
  getUserStreak,
  getUserNutritionData,
  getRecentFoodEntries,
} from "../services/streakService";

// Register a new user
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with that email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate verification code (6 digits)
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Set verification expiration (24 hours)
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24);

    // Create new user with minimal required fields
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        verificationCode,
        verificationExpiresAt,
        profileSetupComplete: false, // Track whether user has completed profile setup
      },
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode);

    if (!emailSent) {
      logger.warn(
        `Failed to send verification email during registration for: ${email}`
      );
      // We still continue with registration, but inform the client
    }

    // TODO: Send verification code via SMS

    // Return user without sensitive information
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      profileSetupComplete: false,
    };

    return res.status(201).json({
      message:
        "User registered successfully. Please check your email for verification.",
      user: userResponse,
    });
  } catch (error) {
    logger.error("Error registering user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Verify a user's account
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;

    // Find user by phone number
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber,
        verificationCode: code,
        verificationExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    // Update user to verified
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "Account verified successfully" });
  } catch (error) {
    logger.error(`Error verifying user: ${error}`);
    return res.status(500).json({ error: "Failed to verify user" });
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req.user as { id: string }).id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        targetWeight: true,
        activityLevel: true,
        dietaryPreferences: true,
        allergies: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        phoneNumber: true,
        isVerified: true,
        createdAt: true,
        profilePicture: true,
        profileSetupComplete: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error(`Error getting user profile: ${error}`);
    return res.status(500).json({ error: "Failed to get user profile" });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string }).id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      height,
      weight,
      targetWeight,
      activityLevel,
      dietaryPreferences,
      allergies,
      fitnessGoals,
      profileSetupComplete,
      dailyCalorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal,
      // Handle unit information
      heightUnit,
      weightUnit,
      originalHeight,
      originalWeight,
      originalTargetWeight,
    } = req.body;

    // Log the received data for debugging
    logger.info(
      `Updating profile for user ${userId} with data: ${JSON.stringify(
        req.body
      )}`
    );

    // Prepare data to update
    const updateData: Record<string, any> = {};

    // Handle basic fields
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) updateData.gender = gender;
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel;
    if (dietaryPreferences !== undefined)
      updateData.dietaryPreferences = dietaryPreferences;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (fitnessGoals !== undefined) updateData.fitnessGoals = fitnessGoals;
    if (profileSetupComplete !== undefined)
      updateData.profileSetupComplete = profileSetupComplete;

    // Handle height with unit conversion if needed
    if (height !== undefined) {
      // Store height in cm (metric) in the database
      if (heightUnit === "imperial" && originalHeight) {
        // Convert from imperial (feet/inches) to metric (cm)
        try {
          const feet = parseFloat(originalHeight.ft?.toString() || "0");
          const inches = parseFloat(originalHeight.in?.toString() || "0");
          // 1 foot = 30.48 cm, 1 inch = 2.54 cm
          updateData.height = Math.round(feet * 30.48 + inches * 2.54);
          logger.info(
            `Converted height from ${feet}ft ${inches}in to ${updateData.height}cm`
          );
        } catch (convError) {
          logger.error(`Error converting height: ${convError}`);
          // Fall back to the provided height value
          updateData.height = parseFloat(height.toString());
        }
      } else {
        // Use the provided height (already in cm)
        updateData.height = parseFloat(height.toString());
      }
    }

    // Handle weight with unit conversion if needed
    if (weight !== undefined) {
      // Store weight in kg (metric) in the database
      if (weightUnit === "imperial" && originalWeight) {
        // Convert from imperial (lb) to metric (kg)
        try {
          const pounds = parseFloat(originalWeight.lb?.toString() || "0");
          // 1 lb = 0.453592 kg
          updateData.weight = parseFloat((pounds * 0.453592).toFixed(2));
          logger.info(
            `Converted weight from ${pounds}lb to ${updateData.weight}kg`
          );
        } catch (convError) {
          logger.error(`Error converting weight: ${convError}`);
          // Fall back to the provided weight value
          updateData.weight = parseFloat(weight.toString());
        }
      } else {
        // Use the provided weight (already in kg)
        updateData.weight = parseFloat(weight.toString());
      }
    }

    // Handle target weight with unit conversion if needed
    if (targetWeight !== undefined) {
      // Store target weight in kg (metric) in the database
      if (weightUnit === "imperial" && originalTargetWeight) {
        // Convert from imperial (lb) to metric (kg)
        try {
          const pounds = parseFloat(originalTargetWeight.lb?.toString() || "0");
          // 1 lb = 0.453592 kg
          updateData.targetWeight = parseFloat((pounds * 0.453592).toFixed(2));
          logger.info(
            `Converted target weight from ${pounds}lb to ${updateData.targetWeight}kg`
          );
        } catch (convError) {
          logger.error(`Error converting target weight: ${convError}`);
          // Fall back to the provided target weight value
          updateData.targetWeight = parseFloat(targetWeight.toString());
        }
      } else {
        // Use the provided target weight (already in kg)
        updateData.targetWeight = parseFloat(targetWeight.toString());
      }
    }

    // Handle nutrition goals
    if (dailyCalorieGoal !== undefined) {
      updateData.dailyCalorieGoal = parseInt(dailyCalorieGoal.toString());
    }

    if (proteinGoal !== undefined) {
      updateData.proteinGoal = parseFloat(proteinGoal.toString());
    }

    if (carbsGoal !== undefined) {
      updateData.carbsGoal = parseFloat(carbsGoal.toString());
    }

    if (fatGoal !== undefined) {
      updateData.fatGoal = parseFloat(fatGoal.toString());
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        targetWeight: true,
        activityLevel: true,
        dietaryPreferences: true,
        allergies: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        profileSetupComplete: true,
      },
    });

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Error updating user profile: ${error}`);
    return res.status(500).json({ error: "Failed to update user profile" });
  }
};

// Get current user's profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // User ID is already attached to the request by the auth middleware
    const userId = (req as AuthRequest).user?.id;
    const userEmail = (req as AuthRequest).user?.email;

    logger.info(
      `getCurrentUser called for user ID: ${userId} and email: ${userEmail}`
    );

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        profilePicture: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        targetWeight: true,
        activityLevel: true,
        dietaryPreferences: true,
        allergies: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        createdAt: true,
        lastLogin: true,
        profileSetupComplete: true,
        googleId: true, // Add this to check if it's a Google user
        // Exclude sensitive data like passwordHash
      },
    });

    if (!user) {
      logger.error(
        `User not found in database: ${userId}, email: ${userEmail}`
      );
      return res.status(404).json({ error: "User not found" });
    }

    logger.info(
      `Found user data: ${user.email} (${user.id}), expected: ${userEmail}`
    );

    // Verify the user IDs match
    if (user.id !== userId) {
      logger.error(`User ID mismatch! Token: ${userId}, DB: ${user.id}`);
    }

    // Verify the user emails match
    if (user.email !== userEmail) {
      logger.error(
        `User email mismatch! Token: ${userEmail}, DB: ${user.email}`
      );
    }

    // CRITICAL FIX: Check if Google user with empty fitness goals
    const isGoogleUser = !!user.googleId;
    const hasEmptyFitnessGoals =
      !user.fitnessGoals ||
      !Array.isArray(user.fitnessGoals) ||
      user.fitnessGoals.length === 0;

    if (isGoogleUser && hasEmptyFitnessGoals && user.profileSetupComplete) {
      logger.warn(
        `Google user ${user.email} has empty fitness goals but profile marked complete. Fixing...`
      );

      // Force profile to incomplete if Google user has empty fitness goals
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { profileSetupComplete: false },
        });

        // Update the user object
        user.profileSetupComplete = false;

        logger.info(`Updated profileSetupComplete to false for ${user.email}`);
      } catch (updateError) {
        logger.error(`Failed to update profileSetupComplete: ${updateError}`);
      }
    }

    // Return user data
    return res.json(user);
  } catch (error) {
    logger.error(`Error getting current user: ${error}`);
    return res.status(500).json({ error: "Server error" });
  }
};

// Update current user's profile
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Extract fields from request body
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      height,
      weight,
      targetWeight,
      activityLevel,
      dietaryPreferences,
      allergies,
      fitnessGoals,
      dailyCalorieGoal,
      profilePicture,
    } = req.body;

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        height,
        weight,
        targetWeight,
        activityLevel,
        dietaryPreferences,
        allergies,
        fitnessGoals,
        dailyCalorieGoal,
        profilePicture,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        targetWeight: true,
        activityLevel: true,
        dietaryPreferences: true,
        allergies: true,
        fitnessGoals: true,
        dailyCalorieGoal: true,
        profilePicture: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    logger.error(`Error updating user: ${error}`);
    return res.status(500).json({ error: "Server error" });
  }
};

// Force update fitness goals for users (especially useful for Google users)
export const forceUpdateGoals = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string }).id;
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
};

/**
 * Record user login and update streak
 * @param req Express request
 * @param res Express response
 */
export async function recordLoginStreak(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const result = await recordUserLogin(userId);

    return res.status(200).json({
      success: true,
      streak: result.streak,
    });
  } catch (error) {
    console.error("Error recording login streak:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record login streak",
    });
  }
}

/**
 * Get nutrition dashboard data for the user
 * @param req Express request
 * @param res Express response
 */
export async function getDashboardData(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    // Get date from query params or use today
    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    const [streak, nutritionData, recentFood] = await Promise.all([
      getUserStreak(userId),
      getUserNutritionData(userId, date),
      getRecentFoodEntries(userId, 1), // Get most recent food entry
    ]);

    return res.status(200).json({
      success: true,
      dashboardData: {
        streak,
        nutritionData,
        recentFood: recentFood[0] || null,
      },
    });
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get dashboard data",
    });
  }
}

/**
 * Log a meal entry for the user
 * @param req Express request
 * @param res Express response
 */
export async function logMeal(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const {
      mealType,
      mealName,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      consumedAt,
      foodItems,
      gptAnalysisJson,
    } = req.body;

    // Validate required fields
    if (!mealType || !mealName || totalCalories === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields for meal entry",
      });
    }

    // Create meal entry
    const mealEntry = await prisma.mealEntry.create({
      data: {
        userId,
        mealType,
        mealName,
        totalCalories: parseFloat(totalCalories),
        totalProtein: parseFloat(totalProtein || 0),
        totalCarbs: parseFloat(totalCarbs || 0),
        totalFat: parseFloat(totalFat || 0),
        consumedAt: consumedAt ? new Date(consumedAt) : new Date(),
        gptAnalysisJson: gptAnalysisJson || undefined,
        foodItems: {
          create: (foodItems || []).map((item: any) => ({
            foodName: item.name,
            portionSize: parseFloat(item.portionSize) || 1,
            portionUnit: item.portionUnit || "serving",
            calories: parseFloat(item.calories) || 0,
            protein: parseFloat(item.protein) || 0,
            carbs: parseFloat(item.carbs) || 0,
            fat: parseFloat(item.fat) || 0,
            fiber: item.fiber ? parseFloat(item.fiber) : undefined,
            sugar: item.sugar ? parseFloat(item.sugar) : undefined,
            sodium: item.sodium ? parseFloat(item.sodium) : undefined,
            source: item.source,
            externalFoodId: item.externalFoodId,
            isFavorite: item.isFavorite || false,
          })),
        },
      },
      include: {
        foodItems: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Meal logged successfully",
      mealEntry,
    });
  } catch (error) {
    console.error("Error logging meal:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to log meal",
    });
  }
}

/**
 * Get meals for a user within a date range
 * @param req Express request
 * @param res Express response
 */
export async function getMeals(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Start date and end date are required",
      });
    }

    const meals = await prisma.mealEntry.findMany({
      where: {
        userId,
        consumedAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        foodItems: true,
      },
      orderBy: {
        consumedAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      meals,
    });
  } catch (error) {
    console.error("Error getting meals:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get meals",
    });
  }
}

// Search users
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { query } = req.query;

    if (!userId || !query) {
      return res
        .status(400)
        .json({ error: "User ID and search query are required" });
    }

    // Search for users by name or email
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { firstName: { contains: query as string, mode: "insensitive" } },
              { lastName: { contains: query as string, mode: "insensitive" } },
              { email: { contains: query as string, mode: "insensitive" } },
            ],
          },
          { id: { not: userId } }, // Exclude current user
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
      },
      take: 10, // Limit results
    });

    // Filter out users who are already friends or have pending requests
    const existingRelationships = await prisma.userFriend.findMany({
      where: {
        OR: [
          { userId, friendId: { in: users.map((u) => u.id) } },
          { userId: { in: users.map((u) => u.id) }, friendId: userId },
        ],
      },
    });

    const filteredUsers = users.filter(
      (user) =>
        !existingRelationships.some(
          (rel) =>
            (rel.userId === userId && rel.friendId === user.id) ||
            (rel.userId === user.id && rel.friendId === userId)
        )
    );

    return res.status(200).json(filteredUsers);
  } catch (error) {
    logger.error(`Error searching users: ${error}`);
    return res.status(500).json({ error: "Failed to search users" });
  }
};

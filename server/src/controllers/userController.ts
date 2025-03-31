import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middleware/auth";

// Register a new user
export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      gender,
      height,
      weight,
      targetWeight,
      activityLevel,
      dietaryPreferences,
      allergies,
    } = req.body;

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
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        height,
        weight,
        targetWeight,
        activityLevel,
        dietaryPreferences: dietaryPreferences || [],
        allergies: allergies || [],
        verificationCode,
        verificationExpiresAt,
      },
    });

    // TODO: Send verification code via SMS

    // Return user without sensitive information
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };

    return res.status(201).json({
      message: "User registered successfully. Please verify your account.",
      user: userResponse,
    });
  } catch (error) {
    logger.error(`Error registering user: ${error}`);
    return res.status(500).json({ error: "Failed to register user" });
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
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        phoneNumber: true,
        isVerified: true,
        createdAt: true,
        profilePicture: true,
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
      dailyCalorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal,
      profilePicture,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        height,
        weight,
        targetWeight,
        activityLevel,
        dietaryPreferences,
        allergies,
        dailyCalorieGoal,
        proteinGoal,
        carbsGoal,
        fatGoal,
        profilePicture,
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
        dailyCalorieGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        profilePicture: true,
      },
    });

    return res.status(200).json({
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
        dailyCalorieGoal: true,
        createdAt: true,
        lastLogin: true,
        // Exclude sensitive data like passwordHash
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middleware/auth";
import { sendVerificationEmail } from "../utils/emailService";

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
      profileSetupComplete,
    } = req.body;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        height:
          height !== undefined ? parseFloat(height.toString()) : undefined,
        weight:
          weight !== undefined ? parseFloat(weight.toString()) : undefined,
        targetWeight:
          targetWeight !== undefined
            ? parseFloat(targetWeight.toString())
            : undefined,
        activityLevel,
        dietaryPreferences,
        allergies,
        profileSetupComplete,
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
        dailyCalorieGoal: true,
        createdAt: true,
        lastLogin: true,
        profileSetupComplete: true,
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

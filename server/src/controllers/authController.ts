import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { logger } from "../utils/logger";

// Login user
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        error: "Account not verified. Please verify your account first.",
      });
    }

    // Verify password (skip for OAuth users)
    if (user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } else if (!user.passwordHash && password) {
      // User exists but has no password (OAuth user)
      return res.status(401).json({ error: "Please login with Google" });
    }

    // Generate JWT token
    const secretKey = process.env.JWT_SECRET || "fallback-secret-key";
    // @ts-ignore
    const token = jwt.sign({ id: user.id, email: user.email }, secretKey);

    // Update last login
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLogin: new Date(),
      },
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    logger.error(`Error logging in user: ${error}`);
    return res.status(500).json({ error: "Failed to login" });
  }
};

// Google OAuth Callback
export const googleAuthCallback = (req: Request, res: Response) => {
  try {
    // User will be added to req by Passport.js
    if (!req.user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/auth?error=Authentication failed`
      );
    }

    // Create JWT token
    const secretKey = process.env.JWT_SECRET || "fallback-secret-key";
    // @ts-ignore
    const token = jwt.sign(
      {
        id: (req.user as { id: string }).id,
        email: (req.user as { email: string }).email,
      },
      secretKey
    );

    // Redirect back to the client app with the token
    return res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
  } catch (error) {
    logger.error(`Google auth callback error: ${error}`);
    return res.redirect(
      `${process.env.CLIENT_URL}/auth?error=Authentication failed`
    );
  }
};

// Reset password request
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is an OAuth user
    if (!user.passwordHash) {
      return res.status(400).json({
        error:
          "This account uses Google login, password reset is not available",
      });
    }

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Update user with verification code
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        verificationCode,
        verificationExpiresAt,
      },
    });

    // TODO: Send verification code via SMS

    return res
      .status(200)
      .json({ message: "Password reset code sent to your phone" });
  } catch (error) {
    logger.error(`Error requesting password reset: ${error}`);
    return res.status(500).json({ error: "Failed to request password reset" });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code, newPassword } = req.body;

    // Find user with valid verification code
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

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password and clear verification code
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    logger.error(`Error resetting password: ${error}`);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

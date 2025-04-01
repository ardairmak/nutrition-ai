import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middleware/auth";
import { sendVerificationEmail as sendEmail } from "../utils/emailService";

// Helper function to generate JWT tokens consistently
const generateJwtToken = (userId: string, userEmail: string): string => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    logger.error("JWT_SECRET is not defined in environment variables");
    throw new Error("Server configuration error");
  }

  const token = jwt.sign(
    {
      id: userId,
      email: userEmail,
    },
    secretKey
  );

  logger.info(`Generated JWT token for: ${userEmail} (${userId})`);
  logger.info(`Token length: ${token.length} characters`);
  return token;
};

// Login user
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if this is a social login user (Google, etc.)
    if (!user.passwordHash && user.googleId) {
      logger.info(`Social login user tried email login: ${user.id}`);
      return res.status(400).json({
        error:
          "This email is registered with Google. Please use 'Continue with Google' instead.",
      });
    }

    // Verify password
    if (!user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Now we know passwordHash is not null
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      logger.info(`Unverified user attempted login: ${user.id}`);
      return res.status(403).json({
        error: "Account not verified. Please verify your email to continue.",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Create JWT token
    const token = generateJwtToken(user.id, user.email);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log success with auth method
    logger.info(`User logged in via email: ${user.id}`);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        profileSetupComplete: user.profileSetupComplete || false,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    return res.status(500).json({ error: "Login failed" });
  }
};

// Google OAuth Callback
export const googleAuthCallback = (req: Request, res: Response) => {
  try {
    // User will be added to req by Passport.js
    if (!req.user) {
      logger.error("No user found in request after Google authentication");
      return res.redirect(
        `${process.env.CLIENT_URL}/auth?error=Authentication failed`
      );
    }

    const authUser = req.user as { id: string; email: string };

    // Log detailed information about the authenticated user
    logger.info(
      `Google auth callback for user: ${authUser.email} (${authUser.id})`
    );
    logger.info(`User object from request: ${JSON.stringify(req.user)}`);

    // Create JWT token using our helper function
    const token = generateJwtToken(authUser.id, authUser.email);

    // Ensure token doesn't have any invalid characters
    if (!token) {
      logger.error("Failed to generate JWT token for user");
      return res.redirect(
        `${process.env.CLIENT_URL}/auth?error=Token generation failed`
      );
    }

    // Get mobile flag and redirect URI from session or query
    const mobileFlag =
      req.session?.isMobile === true || req.query.mobile === "true";
    const redirectUri =
      req.session?.redirectUri || (req.query.redirect_uri as string) || "";

    logger.info(`Mobile flag (from session/query): ${mobileFlag}`);
    logger.info(`Redirect URI (from session/query): ${redirectUri || "none"}`);

    // Clear session data
    if (req.session) {
      req.session.isMobile = undefined;
      req.session.redirectUri = undefined;
    }

    // Prioritize the mobile app redirect
    if (
      redirectUri &&
      (redirectUri.startsWith("foodrecognition://") ||
        redirectUri.startsWith("exp://"))
    ) {
      // Ensure no fragment character is included in the redirect URL
      const cleanToken = token.replace(/#/g, "");
      const redirectUrl = redirectUri.includes("?")
        ? `${redirectUri}&token=${cleanToken}`
        : `${redirectUri}?token=${cleanToken}`;

      logger.info(`Redirecting to app with custom scheme: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    }

    // Default mobile redirect if mobile flag is set
    if (mobileFlag) {
      const redirectUrl = `foodrecognition://auth?token=${token}`;
      logger.info(`Redirecting to app with default scheme: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    }

    // Fallback to web client
    logger.info(
      `Redirecting to web client: ${process.env.CLIENT_URL}/auth?token=${token}`
    );
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

// Google Authentication
export const googleAuthentication = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    // For real implementation, you would verify the Google ID token
    // using the Google Auth Library:
    // const ticket = await client.verifyIdToken({
    //    idToken: token,
    //    audience: process.env.GOOGLE_CLIENT_ID,
    // });
    // const payload = ticket.getPayload();

    // Parse the token (simplified approach)
    let tokenData;
    try {
      // Simple parsing for demo purposes only - NOT SECURE
      tokenData = JSON.parse(
        Buffer.from(idToken.split(".")[1], "base64").toString()
      );
    } catch (e) {
      logger.error(`Error parsing Google token: ${e}`);
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const googleId = tokenData.sub || tokenData.user_id;
    const email = tokenData.email || "";
    const name = tokenData.name || "";
    const picture = tokenData.picture || null;

    if (!googleId || !email) {
      return res.status(401).json({ error: "Invalid token data" });
    }

    // Check if user exists in our database
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (!user) {
      // Create new user
      const firstName = name.split(" ")[0] || null;
      const lastName = name.split(" ").slice(1).join(" ") || null;

      user = await prisma.user.create({
        data: {
          email,
          googleId,
          firstName: firstName || email.split("@")[0], // Fallback to email username if no name
          lastName: lastName || "", // Empty string instead of null
          profilePicture: picture,
          isVerified: true, // Google has already verified the email
          lastLogin: new Date(),
          profileSetupComplete: false, // Set explicitly to false for onboarding
        },
      });

      logger.info(`New user created from Google auth: ${user.id}`);
    } else {
      // Update existing user but don't modify firstName, lastName, or profileSetupComplete
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId, // Ensure Google ID is linked
          lastLogin: new Date(),
          isVerified: true,
        },
      });

      logger.info(`Existing user logged in via Google: ${user.id}`);
    }

    // Generate JWT token with our helper function
    const token = generateJwtToken(user.id, user.email);

    // Return user info and token
    return res.status(200).json({
      message: "Google authentication successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        profileSetupComplete: user.profileSetupComplete || false,
      },
    });
  } catch (error) {
    logger.error(`Google authentication error: ${error}`);
    return res
      .status(500)
      .json({ error: "Failed to authenticate with Google" });
  }
};

// Send verification email
export const sendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ error: "Account already verified" });
    }

    // Generate new verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Set expiration time (24 hours)
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24);

    // Update user with new code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpiresAt,
      },
    });

    // Send email with verification code
    const emailSent = await sendEmail(email, verificationCode);

    if (!emailSent) {
      logger.warn(`Failed to send verification email to: ${email}`);
      return res.status(500).json({
        error: "Failed to send verification email",
        message:
          "Server could not send the verification email. Please try again later.",
      });
    }

    logger.info(`Verification email sent to: ${email}`);
    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    logger.error("Error sending verification email:", error);
    return res.status(500).json({ error: "Failed to send verification email" });
  }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    // Find user with valid verification code
    const user = await prisma.user.findFirst({
      where: {
        email,
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

    // Update user to verified and clear verification code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    logger.error(`Error verifying email: ${error}`);
    return res.status(500).json({ error: "Failed to verify email" });
  }
};

// Set password for social login accounts
export const setPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the user with the new password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info(`Password set for social login user: ${userId}`);

    return res
      .status(200)
      .json({ message: "Password has been set successfully" });
  } catch (error) {
    logger.error(`Error setting password: ${error}`);
    return res.status(500).json({ error: "Failed to set password" });
  }
};

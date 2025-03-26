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

    // Check if we're in development mode (for simulator testing)
    const isDevelopment = process.env.NODE_ENV === "development";
    const isSimulatorTest =
      isDevelopment &&
      (req.headers["user-agent"]?.includes("iPhone Simulator") ||
        req.headers["user-agent"]?.includes("iOS") ||
        req.headers["user-agent"]?.includes("Safari") ||
        req.query.is_simulator === "true");

    // For iOS simulator testing ONLY in development, show a page with the token
    if (isSimulatorTest && process.env.SHOW_TOKEN_PAGE === "true") {
      logger.info(
        `User logged in via Google OAuth: ${(req.user as { id: string }).id}`
      );
      logger.info(`Auth token for simulator testing: ${token}`);

      // Return an HTML page with the token for easy testing
      return res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; text-align: center; line-height: 1.6; }
              .container { max-width: 500px; margin: 0 auto; }
              .token-box { background: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; margin: 20px 0; text-align: left; }
              h1 { color: #2c3e50; }
              .success { color: #27ae60; }
              button { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; cursor: pointer; margin-top: 15px; }
              button:hover { background: #2980b9; }
              a.redirect-link { display: inline-block; margin-top: 20px; color: #3498db; text-decoration: none; }
              .note { font-size: 14px; color: #e74c3c; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Authentication Successful</h1>
              <p class="success">✓ Your Google login was successful!</p>
              <p>Your authentication token is:</p>
              <div class="token-box" id="tokenBox">${token}</div>
              <button onclick="copyToken()">Copy Token</button>
              <p class="note">For simulator testing: Go back to the app and tap "Check for token"</p>
              <p class="note">In a real device, this page would not appear, and the app would open automatically.</p>
              <script>
                function copyToken() {
                  const tokenText = document.getElementById('tokenBox').innerText;
                  navigator.clipboard.writeText(tokenText)
                    .then(() => {
                      alert('Token copied to clipboard. Now return to the app and tap "Check for token"');
                    })
                    .catch(err => {
                      alert('Error copying token: ' + err);
                    });
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    // In production or when not testing, use the app scheme directly
    // This is what real users will see - direct app redirect
    logger.info(
      `Redirecting to mobile app via scheme: foodrecognition://auth?token=${token}`
    );
    return res.redirect(`foodrecognition://auth?token=${token}`);
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

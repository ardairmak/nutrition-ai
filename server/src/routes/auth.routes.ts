import { Router } from "express";
import passport from "passport";
import * as authController from "../controllers/authController";
import { registerUser } from "../controllers/userController";
import { logger } from "../utils/logger";
import { authenticate } from "../middleware/auth";

// Extend Express Session types
declare module "express-session" {
  interface SessionData {
    appRedirectUri?: string;
    showToken?: boolean;
    isMobile?: boolean;
    redirectUri?: string;
  }
}

// Create router instance
const router = Router();

// Login route
router.post("/login", authController.loginUser);

// Register new user
router.post("/register", registerUser);

// Password reset request
router.post("/reset-password-request", authController.requestPasswordReset);

// Reset password
router.post("/reset-password", authController.resetPassword);

// Google Authentication route
router.post("/google-token", authController.googleAuthentication);

// Email verification
router.post("/verify/send", authController.sendVerificationEmail);
router.post("/verify", authController.verifyEmail);

// Google OAuth route - initial authentication
router.get(
  "/google",
  (req, res, next) => {
    // Store mobile flag and redirect_uri in session
    if (req.query.mobile === "true") {
      req.session.isMobile = true;
    }
    if (req.query.redirect_uri) {
      req.session.redirectUri = req.query.redirect_uri as string;
    }

    // Log the request details
    logger.info(
      `Google auth initiated from ${req.ip}, User-Agent: ${req.get(
        "User-Agent"
      )}`
    );
    logger.info(`Query params: ${JSON.stringify(req.query)}`);

    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    // Include timestamp to prevent caching issues
    state: Date.now().toString(),
    // Don't prompt if already authenticated with Google
    prompt: "select_account",
  })
);

// Google OAuth callback route
router.get(
  "/google/callback",
  (req, res, next) => {
    // Log details about the callback request
    logger.info(`Google callback received from IP: ${req.ip}`);
    logger.info(`Query params: ${JSON.stringify(req.query)}`);

    // Restore mobile flag and redirect_uri from session
    if (req.session.isMobile) {
      req.query.mobile = "true";
    }
    if (req.session.redirectUri) {
      req.query.redirect_uri = req.session.redirectUri;
    }

    next();
  },
  (req, res, next) => {
    // Handle potential errors from Google
    if (req.query.error) {
      logger.error(`Google auth error: ${req.query.error}`);

      // If mobile flow, redirect to app with error
      if (req.query.mobile === "true") {
        return res.redirect(
          `foodrecognition://auth?error=${encodeURIComponent(
            req.query.error as string
          )}`
        );
      }

      // Otherwise redirect to web client
      return res.redirect(
        `${process.env.CLIENT_URL}/auth?error=${encodeURIComponent(
          req.query.error as string
        )}`
      );
    }
    next();
  },
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  authController.googleAuthCallback
);

// Add route for setting password (requires authentication)
router.post("/set-password", authenticate, (req, res) =>
  authController.setPassword(req as any, res)
);

export default router;

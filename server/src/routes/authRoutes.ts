import { Router } from "express";
import passport from "passport";
import * as authController from "../controllers/authController";

const router = Router();

// Login route
router.post("/login", authController.loginUser);

// Password reset request
router.post("/reset-password-request", authController.requestPasswordReset);

// Reset password
router.post("/reset-password", authController.resetPassword);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  authController.googleAuthCallback
);

export default router;

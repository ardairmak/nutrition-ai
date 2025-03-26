import { Router } from "express";
import * as authController from "../controllers/authController";

const router = Router();

// Login route
router.post("/login", authController.loginUser);

// Password reset request
router.post("/reset-password-request", authController.requestPasswordReset);

// Reset password
router.post("/reset-password", authController.resetPassword);

export default router;

import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = Router();

// Public routes
router.post("/register", userController.registerUser);
router.post("/verify", userController.verifyUser);

// Protected routes (require authentication)
router.get("/profile", authenticateUser, userController.getUserProfile);
router.get("/profile/:userId", authenticateUser, userController.getUserProfile);
router.put("/profile", authenticateUser, userController.updateUserProfile);

export default router;

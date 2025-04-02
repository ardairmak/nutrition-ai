import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Protected routes (require authentication)
router.get("/me", authenticate, userController.getCurrentUser);
router.put("/", authenticate, userController.updateUser);
router.put("/profile", authenticate, userController.updateUserProfile);

// Export fitness goals troubleshooting endpoint
router.post(
  "/force-update-goals",
  authenticate,
  userController.forceUpdateGoals
);

export default router;

import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate, withAuth } from "../middleware/auth";
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

// Routes using the withAuth wrapper for AuthRequest compatibility

// Record login and update streak
router.post(
  "/login-streak",
  authenticate,
  withAuth(userController.recordLoginStreak)
);

// Get dashboard data
router.get(
  "/dashboard-data",
  authenticate,
  withAuth(userController.getDashboardData)
);

// Get login history for last 7 days
router.get(
  "/login-history",
  authenticate,
  withAuth(userController.getLoginHistory)
);

// Recalculate calorie goals
router.post(
  "/recalculate-goals",
  authenticate,
  withAuth(userController.recalculateCalorieGoals)
);

// Log a meal
router.post("/meals", authenticate, withAuth(userController.logMeal));

// Get meals
router.get("/meals", authenticate, withAuth(userController.getMeals));

// Search users
router.get("/search", authenticate, withAuth(userController.searchUsers));

// Notification settings routes
router.get(
  "/notification-settings",
  authenticate,
  userController.getNotificationSettings
);
router.put(
  "/notification-settings",
  authenticate,
  userController.updateNotificationSettings
);

export default router;

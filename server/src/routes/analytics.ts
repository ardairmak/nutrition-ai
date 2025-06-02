import express from "express";
import { authenticate, withAuth } from "../middleware/auth";
import {
  getComprehensiveAnalytics,
  getAIInsights,
  getFoodRecommendations,
  aiChat,
} from "../controllers/analyticsController";

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

// Get comprehensive analytics
router.post("/comprehensive", withAuth(getComprehensiveAnalytics));

// Get AI insights only
router.post("/ai-insights", withAuth(getAIInsights));

// Get food recommendations
router.post("/food-recommendations", withAuth(getFoodRecommendations));

// AI Chat endpoint
router.post("/chat", withAuth(aiChat));

export default router;

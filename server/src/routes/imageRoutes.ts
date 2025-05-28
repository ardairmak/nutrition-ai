import express from "express";
import { analyzeImage } from "../controllers/imageController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

/**
 * @route POST /api/images/analyze
 * @desc Analyze a food image using GPT vision
 * @access Private (requires authentication)
 */
router.post("/analyze", authenticate, analyzeImage);

export default router;

import express from "express";
import {
  logWeight,
  getWeightHistory,
  deleteWeightEntry,
} from "../controllers/weightController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Weight history endpoints
router.post("/log", logWeight);
router.get("/history", getWeightHistory);
router.delete("/:entryId", deleteWeightEntry);

export default router;

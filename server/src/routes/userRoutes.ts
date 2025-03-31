import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Protected routes (require authentication)
router.get("/me", authenticate, userController.getCurrentUser);
router.put("/", authenticate, userController.updateUser);

export default router;

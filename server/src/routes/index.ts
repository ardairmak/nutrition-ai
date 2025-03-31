import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./userRoutes";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;

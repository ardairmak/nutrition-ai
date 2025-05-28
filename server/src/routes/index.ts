import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./userRoutes";
import imageRoutes from "./imageRoutes";
import friendRoutes from "./friendRoutes";
import weightRoutes from "./weightRoutes";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/images", imageRoutes);
router.use("/friends", friendRoutes);
router.use("/weight", weightRoutes);

export default router;

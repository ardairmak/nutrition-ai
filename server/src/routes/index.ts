import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./userRoutes";
import imageRoutes from "./imageRoutes";
import friendRoutes from "./friendRoutes";
import weightRoutes from "./weightRoutes";
import uploadRoutes from "./uploadRoutes";
import analyticsRoutes from "./analytics";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/images", imageRoutes);
router.use("/friends", friendRoutes);
router.use("/weight", weightRoutes);
router.use("/upload", uploadRoutes);
router.use("/analytics", analyticsRoutes);

export default router;

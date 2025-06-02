import express from "express";
import { authenticate, withAuth } from "../middleware/auth";
import {
  upload,
  uploadMealImage,
  uploadProfileImage,
  getSignedUrl,
  deleteImage,
} from "../controllers/uploadController";

const router = express.Router();

// All upload routes require authentication
router.use(authenticate);

// Meal image routes
router.post("/meal", upload.single("image"), withAuth(uploadMealImage));

// Profile image routes
router.post("/profile", upload.single("image"), withAuth(uploadProfileImage));

// Get signed URL for existing image
router.get("/signed-url/:s3Key", withAuth(getSignedUrl));

// Delete image route
router.delete("/:imageKey", withAuth(deleteImage));

export default router;

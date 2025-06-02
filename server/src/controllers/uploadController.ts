import { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import {
  uploadToS3,
  generateSignedUrl,
  S3_CONFIG,
  deleteFromS3,
} from "../config/aws";
import { AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (S3_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed.")
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: S3_CONFIG.MAX_FILE_SIZE,
  },
});

// Process and optimize image
const processImage = async (
  buffer: Buffer,
  type: "meal" | "profile"
): Promise<Buffer> => {
  const maxWidth = type === "profile" ? 400 : 800;
  const maxHeight = type === "profile" ? 400 : 600;
  const quality = type === "profile" ? 90 : 80;

  return sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality })
    .toBuffer();
};

// Helper function to extract S3 key from URL
const extractS3KeyFromUrl = (url: string): string | null => {
  try {
    // Handle different S3 URL formats
    if (url.includes("amazonaws.com/")) {
      // Format: https://bucket.s3.region.amazonaws.com/key
      const parts = url.split("amazonaws.com/");
      return parts[1] || null;
    } else if (url.includes("s3.amazonaws.com/")) {
      // Format: https://s3.amazonaws.com/bucket/key
      const parts = url.split("s3.amazonaws.com/");
      if (parts[1]) {
        const keyParts = parts[1].split("/");
        return keyParts.slice(1).join("/"); // Remove bucket name
      }
    }
    return null;
  } catch (error) {
    console.error("Error extracting S3 key from URL:", error);
    return null;
  }
};

// Upload meal image
export const uploadMealImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Process image
    const processedImage = await processImage(req.file.buffer, "meal");

    // Generate unique filename
    const fileExtension = "jpg"; // Always convert to JPEG
    const fileName = `${uuidv4()}.${fileExtension}`;
    const s3Key = `${S3_CONFIG.FOLDERS.MEALS}${userId}/${fileName}`;

    // Upload to S3
    const uploadResult = await uploadToS3(processedImage, s3Key, "image/jpeg");

    // Generate signed URL for immediate access
    const signedUrl = generateSignedUrl(s3Key);

    res.json({
      success: true,
      data: {
        imageUrl: uploadResult.Location,
        signedUrl,
        s3Key,
        fileName,
      },
    });
  } catch (error) {
    console.error("Error uploading meal image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

// Upload profile image
export const uploadProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get current user to check for existing profile picture
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    // Delete old profile picture from S3 if it exists
    if (currentUser?.profilePicture) {
      try {
        // Extract S3 key from the URL
        const oldS3Key = extractS3KeyFromUrl(currentUser.profilePicture);
        if (oldS3Key) {
          await deleteFromS3(oldS3Key);
          console.log(`Deleted old profile picture: ${oldS3Key}`);
        }
      } catch (deleteError) {
        console.warn("Failed to delete old profile picture:", deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Process image
    const processedImage = await processImage(req.file.buffer, "profile");

    // Generate unique filename
    const fileExtension = "jpg"; // Always convert to JPEG
    const fileName = `profile_${userId}_${Date.now()}.${fileExtension}`;
    const s3Key = `${S3_CONFIG.FOLDERS.PROFILES}${fileName}`;

    // Upload to S3
    const uploadResult = await uploadToS3(processedImage, s3Key, "image/jpeg");

    // Generate signed URL for immediate access
    const signedUrl = generateSignedUrl(s3Key);

    res.json({
      success: true,
      data: {
        imageUrl: uploadResult.Location,
        signedUrl,
        s3Key,
        fileName,
      },
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

// Get signed URL for existing image
export const getSignedUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { s3Key } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Verify user owns this image (basic security check)
    if (
      !s3Key.includes(userId) &&
      !s3Key.startsWith(S3_CONFIG.FOLDERS.PROFILES)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const signedUrl = generateSignedUrl(s3Key);

    res.json({
      success: true,
      data: {
        signedUrl,
        expiresIn: 3600, // 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
};

// Delete image
export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const { s3Key } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Verify user owns this image
    if (
      !s3Key.includes(userId) &&
      !s3Key.startsWith(S3_CONFIG.FOLDERS.PROFILES)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    await deleteFromS3(s3Key);

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
};

import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Email validation schema
const emailSchema = z.string().email().min(1).max(255);

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

// Basic string sanitization
const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
};

// Generic validation middleware factory
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn(`Validation failed: ${JSON.stringify(error.errors)}`);
        return res.status(400).json({
          error: "Invalid input data",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50).transform(sanitizeString),
  lastName: z.string().min(1).max(50).transform(sanitizeString),
});

export const passwordResetSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  code: z.string().length(6, "Verification code must be 6 digits"),
  newPassword: passwordSchema,
});

export const weightLogSchema = z.object({
  weight: z.number().min(20).max(300, "Weight must be between 20-300kg"),
  recordedAt: z.string().datetime().optional(),
});

export const mealLogSchema = z.object({
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snacks"]),
  calories: z.number().min(0).max(5000),
  carbs: z.number().min(0).max(1000).optional(),
  protein: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(1000).optional(),
  description: z.string().max(500).transform(sanitizeString).optional(),
});

// File validation
export const validateImageFile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
    });
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      error: "File too large. Maximum size is 10MB.",
    });
  }

  next();
};

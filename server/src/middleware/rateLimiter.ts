import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger";

// Environment-aware rate limiting
const isDevelopment = process.env.NODE_ENV === "development";

// General API rate limiting - more generous for development
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 500, // Dev: 1000, Prod: 500 requests per 15min
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
    });
  },
});

// Auth rate limiting - more reasonable for normal usage
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 20, // Dev: 50, Prod: 20 auth attempts per 15min
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Too many authentication attempts, please try again later.",
    });
  },
});

// Very strict rate limiting for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 10 : 3, // Dev: 10, Prod: 3 password resets per hour
  message: {
    error: "Too many password reset attempts, please try again later.",
  },
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Too many password reset attempts, please try again later.",
    });
  },
});

// Rate limiting for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 50, // Dev: 100, Prod: 50 uploads per 15min
  message: {
    error: "Too many file uploads, please try again later.",
  },
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Too many file uploads, please try again later.",
    });
  },
});

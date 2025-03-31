import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { prisma } from "../db";

// Define request with user property
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Middleware to authenticate JWT tokens
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Cast the request to our AuthRequest type
    const authReq = req as AuthRequest;

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Verify token
    const secretKey = process.env.JWT_SECRET || "fallback-secret-key";

    try {
      const decoded = jwt.verify(token, secretKey) as {
        id: string;
        email: string;
      };

      // Add user to request object
      authReq.user = {
        id: decoded.id,
        email: decoded.email,
      };

      // Check if user exists (asynchronously)
      prisma.user
        .findUnique({
          where: { id: decoded.id },
        })
        .then((user) => {
          if (!user) {
            logger.error(`User not found: ${decoded.id}`);
            // Continue anyway since we already added user to request
          }
          next();
        })
        .catch((error) => {
          logger.error(`Database error: ${error}`);
          // Continue anyway since token is valid
          next();
        });
    } catch (jwtError) {
      logger.error(`JWT verification error: ${jwtError}`);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    logger.error(`Authentication error: ${error}`);
    return res.status(500).json({ error: "Server error" });
  }
};

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
export const authenticate = async (
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
      logger.error("No token or incorrect format in Authorization header");
      return res.status(401).json({ error: "No token provided" });
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      logger.error("Empty token after Bearer prefix");
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Log token starting characters for debugging
    logger.info(`Token received: ${token.substring(0, 20)}...`);

    // Verify token
    // IMPORTANT: Use exactly the same secret as when generating tokens
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      logger.error("JWT_SECRET is not defined in environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    try {
      // Log the token details for debugging
      logger.info(
        `Auth middleware processing token: ${token.substring(0, 10)}...`
      );

      const decoded = jwt.verify(token, secretKey) as {
        id: string;
        email: string;
        exp?: number;
        iat?: number;
        jti?: string;
      };

      if (!decoded || !decoded.id || !decoded.email) {
        logger.error("Token payload missing required fields");
        return res.status(401).json({ error: "Invalid token data" });
      }

      // Verify token expiration manually for extra safety
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        logger.error(
          `Token expired at ${new Date(
            decoded.exp * 1000
          ).toISOString()}, current time: ${new Date().toISOString()}`
        );
        return res.status(401).json({ error: "Token expired" });
      }

      logger.info(
        `JWT token decoded for ID: ${decoded.id}, email: ${decoded.email}`
      );

      // Add user to request object
      authReq.user = {
        id: decoded.id,
        email: decoded.email,
      };

      // Check if user exists (now synchronously)
      try {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

        if (!user) {
          logger.error(`User not found for ID: ${decoded.id}`);
          return res.status(401).json({ error: "User not found" });
        }

        // CRITICAL SECURITY CHECK: Double check the email in the token matches the one in the database
        if (user.email !== decoded.email) {
          logger.error(`SECURITY ERROR: Email mismatch in token vs database!`);
          logger.error(
            `Token email: ${decoded.email}, DB email: ${user.email}`
          );
          logger.error(
            `This may indicate a token was reused for a different user!`
          );
          return res.status(403).json({
            error: "Security violation: token does not match user",
            mismatch: true,
            tokenEmail: decoded.email,
            dataEmail: user.email,
          });
        }

        logger.info(`User authenticated: ${user.email} (${user.id})`);
        next();
      } catch (dbError) {
        logger.error(`Database error: ${dbError}`);
        return res.status(500).json({ error: "Server error" });
      }
    } catch (jwtError) {
      logger.error(`JWT verification error: ${jwtError}`);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    logger.error(`Authentication error: ${error}`);
    return res.status(500).json({ error: "Server error" });
  }
};

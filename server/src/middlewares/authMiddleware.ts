import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { logger } from "../utils/logger";

interface JwtPayload {
  id: string;
  email: string;
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const secretKey = process.env.JWT_SECRET || "fallback-secret-key";

    // Verify token
    // @ts-ignore
    const decoded = jwt.verify(token, secretKey) as JwtPayload;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
      select: {
        id: true,
        email: true,
        isVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Account not verified" });
    }

    // Set user on request object
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Authentication token expired" });
    }

    logger.error(`Authentication error: ${error}`);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

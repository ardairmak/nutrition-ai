import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { Prisma } from "@prisma/client";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export class ValidationError extends CustomError {
  constructor(message: string = "Invalid input data") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTH_ERROR");
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT");
  }
}

// Handle different types of errors
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): AppError {
  switch (error.code) {
    case "P2002": // Unique constraint violation
      return new ConflictError(
        `Duplicate value for field: ${error.meta?.target}`
      );
    case "P2025": // Record not found
      return new NotFoundError("Record not found");
    case "P2003": // Foreign key constraint violation
      return new ValidationError("Invalid reference to related record");
    case "P2014": // Required relation missing
      return new ValidationError("Required relation is missing");
    default:
      return new CustomError(
        "Database operation failed",
        500,
        "DATABASE_ERROR"
      );
  }
}

// Main error handler middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError = error as AppError;

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new ValidationError("Invalid data format");
  } else if (error instanceof SyntaxError && "body" in error) {
    appError = new ValidationError("Invalid JSON format");
  } else if (!appError.statusCode) {
    // Unknown error - set generic 500
    appError.statusCode = 500;
    appError.isOperational = false;
  }

  // Log the error
  const logMessage = `${appError.code || "ERROR"}: ${appError.message}`;

  // Ensure statusCode is always defined (use same logic as later in function)
  const statusCode = appError.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(logMessage, {
      error: appError,
      stack: appError.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  } else {
    logger.warn(logMessage, {
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: appError.message,
    code: appError.code,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === "development" && !appError.isOperational) {
    errorResponse.stack = appError.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  logger.warn(`404 - ${req.method} ${req.url}`, { ip: req.ip });

  res.status(404).json({
    success: false,
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
  });
};

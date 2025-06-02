import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import passport from "passport";
import session from "express-session";
import { logger } from "./utils/logger";
import routes from "./routes";
import "./config/passport";
import { S3CleanupService } from "./services/s3CleanupService";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(helmet());
app.use(compression());

// Rate limiting - apply to all requests
app.use("/api", apiLimiter);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:19006",
      "http://localhost:8081",
    ],
    credentials: true,
  })
);

// Increase JSON payload limit to 50MB for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Set up session (required for passport OAuth flows)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize S3 cleanup scheduler
if (process.env.NODE_ENV === "production") {
  S3CleanupService.scheduleCleanup();
  logger.info("S3 cleanup scheduler initialized for production");
}

// API routes
app.use("/api", routes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;

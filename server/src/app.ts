import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import passport from "passport";
import session from "express-session";
import { logger } from "./utils/logger";
import routes from "./routes";
import "./config/passport";

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
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

// API routes
app.use("/api", routes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Handle 404
app.use((req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Not found" });
});

export default app;

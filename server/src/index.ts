import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import passport from "passport";
import { logger } from "./utils/logger";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import "./config/passport"; // Import passport config

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Routes
app.get("/", (req, res) => {
  res.send("Food Recognition API is running");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

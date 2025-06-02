import dotenv from "dotenv";
import { logger } from "./utils/logger";
import app from "./app";

// Load environment variables first
dotenv.config();

// Validate environment variables before starting the app
import { validateEnv } from "./utils/validateEnv";
validateEnv();

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle unhandled errors
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

import dotenv from "dotenv";
import { logger } from "./utils/logger";
import app from "./app";

// Load environment variables first
dotenv.config();

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled errors
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});
